sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/core/Item",
    "sap/ui/core/library",     
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/TextArea",
    "sap/m/Input",
    "sap/m/library",           
    "sap/m/Label",
    "sap/m/VBox",
    "sap/m/Select",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/FilterType",
    "sap/m/Button",
    "sap/ui/model/odata/v4/ODataModel"
], (Controller, UIComponent, Item, coreLibrary, MessageToast, MessageBox, Dialog, TextArea, Input, mLibrary, Label, VBox, Select, Filter, FilterOperator, FilterType, Button, ODataModel) => {
    "use strict";

    const ValueState = coreLibrary.ValueState;
    const InputType = mLibrary.InputType;

    return Controller.extend("bbroadr.controller.View1", {
        onInit() {},

        //Tételekbe navigálás
        onItemPress(oEvent) {
            //Megszerezzük az adott sort és annak adatait a fejek közül
            const oItem = oEvent.getSource();
            const oContext = oItem.getBindingContext();
            const oData = oContext.getObject();
            const router = UIComponent.getRouterFor(this);
            //Belenavigálunk a megfelelő tételekbe
            router.navTo("RouteItemsView", {
                Zyear: oData.Zyear,
                Zmonth: oData.Zmonth,
                Licenseplate: oData.Licenseplate
            });
        },

        //Csoportos jóváhagyás gomb
        onGroupApprove() {
            this._showReasonDialog("Jóváhagyás");
        },

        //Csoportos elutasítás gomb
        onGroupReject() {
            this._showReasonDialog("Elutasítás");
        },

        //Elfogadás/elutasítás felugró ablak
        _showReasonDialog(sAction) {
            //Megszerezzük a kiválasztott sorokat
            const oTable = this.byId("headerTable");
            const aSelected = oTable.getSelectedItems();

            //Ha nincs kijelölve sor, ekkor visszadobunk egy warningot
            if (aSelected.length === 0) {
                MessageBox.warning("Kérlek, jelölj ki legalább egy sort!");
                return;
            }

            //Többszörös példányosítás megelőzése
            if (this._oReasonDialog) {
                this._oReasonDialog.destroy();
            }

            //Szövegmező definiálása, ahova az indoklást lehet írni
            const oTextArea = new TextArea({
                width: "100%",
                placeholder: "Add meg az indoklást...",
                liveChange: function (oEvent) {
                    const sValue = oEvent.getParameter("value");
                    this.getParent().getBeginButton().setEnabled(sValue.trim().length > 0);
                }
            });

            //Létrehozzuk a felugró ablakot a szövegmezővel
            this._oReasonDialog = new Dialog({
                title: sAction,
                content: [oTextArea],
                beginButton: new Button({
                    text: "OK",
                    enabled: false,
                    //Ha leokézzuk
                    press: async () => {
                        //Szöveg megszerzése
                        const sReason = oTextArea.getValue().trim();
                        this._oReasonDialog.close();
                    
                        sap.ui.core.BusyIndicator.show(0);
                        
                        //Backend rész
                        var oModel = this.getView().getModel();
                        //Végig loopolunk a kiválasztott sorokon
                        aSelected.forEach(oItem => {
                            //Megszerezzük az entitást (entity update)
                            const oCtx = oItem.getBindingContext();
                        
                            //Beállítjuk a note és status mezőket a megfelelő értékekre
                            if (oCtx) {
                                oCtx.setProperty("Note", sReason, "massUpdate");
                                
                                const sStatus = sAction === "Jóváhagyás" ? "APPROVED" : "DECLINED";
                                oCtx.setProperty("Status", sStatus, "massUpdate");
                            }
                        });
                    
                        try {
                            //A történt változásokat elküldjük a backendre is
                            await oModel.submitBatch("massUpdate");
                            MessageToast.show(`${aSelected.length} sor sikeresen ${sAction === "Jóváhagyás" ? "jóváhagyva" : "elutasítva"}.`);
                        } catch (oErr) {
                            MessageBox.error("Hiba történt a mentés során.\nRészletek: " + (oErr?.message || oErr));
                        } finally {
                            sap.ui.core.BusyIndicator.hide();
                        }
                    }                    
                }),                                    
                endButton: new Button({
                    text: "Mégse",
                    //Ha nem fogadjuk el, akkor csak záródjon be a kis ablak
                    press: () => {
                        this._oReasonDialog.close();
                    }
                }),
                //Eltűntetjük, kinullázzuk a dolgokat
                afterClose: () => {
                    this._oReasonDialog.destroy();
                    this._oReasonDialog = null;
                }
            });

            //Valójában itt nyitjuk meg az új kis ablakot, eddig csak definiáltuk a részeit
            this._oReasonDialog.open();
        },

        //Státusz színezés
        formatStatusColor: function(value) {
            switch (value) {
                case "OPEN":
                    return ValueState.Warning;   //sárga
                case "APPROVED":
                    return ValueState.Success;   //zöld
                default:
                    return ValueState.Error;     //piros
            }
        },

        //A forint esetén megfelelő formátumra hozzuk a pénzt, egyébként pedig visszaadjuk 2 tizedesjeggyel
        formatHufPrice: function(value, currency) {
            if (typeof value !== "string") {
                value = value == null ? "" : String(value);
            }
            if (currency === "HUF"){
                value = value.replace(/,/g, '');
                const n = parseFloat(value);

                if (isNaN(n)) {
                    return "0";
                }
                return (n / 100).toFixed(0) + " " + currency;
            }

            value = value.replace(/,/g, '');
            const n = parseFloat(value);

            if (isNaN(n)) {
                return "0";
            }
            return n.toFixed(2) + " " + currency;
        },    

        //Összes szűrés egyben
        handleFilter: function() {
            var oView = this.getView();
            var sStatus = oView.byId("StatusSF").getValue().toUpperCase();
            var sZyear = oView.byId("ZyearSF").getValue();
            var sZmonth = oView.byId("ZmonthSF").getValue();
            var sLicenseplate = oView.byId("LicenseplateSF").getValue().toUpperCase();

            var aFilters = [];

            //működik
            if (sStatus) {
                aFilters.push(new Filter("Status", FilterOperator.StartsWith, sStatus));
            }
            //nem működik
            if (sZyear) {
                aFilters.push(new Filter("Zyear", FilterOperator.StartsWith, sZyear));
            }
            //nem működik
            if (sZmonth) {
                aFilters.push(new Filter("Zmonth", FilterOperator.StartsWith, sZmonth));
            }
            //működik
            if (sLicenseplate) {
                aFilters.push(new Filter("Licenseplate", FilterOperator.StartsWith, sLicenseplate));
            }

            console.log(oView.byId("headerTable").getBinding("items"));
            oView.byId("headerTable").getBinding("items").filter(aFilters, FilterType.Application);
        },

        //Új fesor létrehozása
        onCreateHead: function () {
            this._showCreateDialog();
        },
        
        _showCreateDialog() {
            const oView = this.getView();
            const oModel = oView.getModel();

            //Többszörös példányosítás megelőzése
            if (this._oCreateDialog) {
                this._oCreateDialog.destroy();
            }

            //Beviteli mezők definiálása, ahova az adatokat lehet írni
            const oInputYear = new Input("inputYear", {
                placeholder: "Pl. 2025",
                type: InputType.String
            });
        
            const oInputMonth = new Input("inputMonth", {
                placeholder: "Pl. 07",
                type: InputType.String
            });

            const oInputLp = new Input("inputLp", {
                placeholder: "Pl. ABC123",
                type: InputType.String
            });
        
            const oInputKmStart = new Input("inputKmStart", {
                type: InputType.Number
            });
        
            const oInputAvgPrice = new Input("inputAvgPrice", {
                type: InputType.Number
            });
        
            const oSelectCurr = new Select("inputCurr", {
                items: [
                    new Item({ key: "HUF", text: "HUF" }),
                    new Item({ key: "EUR", text: "EUR" }),
                    new Item({ key: "USD", text: "USD" })
                ]
            });

            //Content létrehozása a dialoghoz
            const oDialogContent = new VBox({
                items: [
                    new Label({ text: "Év" }),
                    oInputYear,
                    new Label({ text: "Hónap" }),
                    oInputMonth,
                    new Label({ text: "Rendszámtábla" }),
                    oInputLp,
                    new Label({ text: "Kezdő kilométeróra állás" }),
                    oInputKmStart,
                    new Label({ text: "Üzemanyag átlagár" }),
                    oInputAvgPrice,
                    new Label({ text: "Pénznem" }),
                    oSelectCurr
                ]
            }).addStyleClass("sapUiSmallMargin");

            const sU = sap.ushell.Container.getUser().getId();
            const sY = sap.ui.getCore().byId("inputYear").getValue();
            const sM = sap.ui.getCore().byId("inputMonth").getValue();
            const sLp = sap.ui.getCore().byId("inputLp").getValue();
            const iKm = parseInt(sap.ui.getCore().byId("inputKmStart").getValue(), 10);
            const fAvg = parseFloat(sap.ui.getCore().byId("inputAvgPrice").getValue());
            const sCurr = sap.ui.getCore().byId("inputCurr").getSelectedKey();

            const oNewEntry = {
                Username: sU, //get the current user using the app
                Zyear: sY, //get oDialogContent.oInputYear
                Zmonth: sM, //get oDialogContent.oInputMonth
                Licenseplate: sLp, //get oDialogContent.oInputLp
                KmStart: iKm, //get oDialogContent.oInputKmStart
                AvgFuelPrice: fAvg, //get oDialogContent.oInputAvgPrice
                AvgFuelCurrency: sCurr, //get oDialogContent.oInputCurr
                Status: "OPEN"
            };

            //Létrehozzuk a felugró ablakot a szövegmezővel
            this._oCreateDialog = new Dialog({
                title: "Új fejsor létrehozása",
                contentWidth: "400px",
                draggable: true,
                resizable: true,
                content: [oDialogContent],
                beginButton: new Button({
                    text: "Létrehozás",
                    press: () => {
                        // Új rekord objektum
                        
                    
                        // Létrehozás az OData modellen
                        oModel.create("/HeaderSet", oNewEntry, {
                            success: function () {
                                MessageToast.show("A fejsor sikeresen létrehozva.");
                                oModel.refresh(); // vagy újra lekérdezés, ha kell
                            },
                            error: function (oError) {
                                MessageBox.error("Hiba történt a létrehozás során.");
                                console.error(oError);
                            }
                        });
                    }                
                }),                                    
                endButton: new Button({
                    text: "Mégse",
                    //Ha nem fogadjuk el, akkor csak záródjon be a kis ablak
                    press: () => {
                        this._oCreateDialog.close();
                    }
                }),
                //Eltűntetjük, kinullázzuk a dolgokat
                afterClose: () => {
                    this._oCreateDialog.destroy();
                    this._oCreateDialog = null;
                }
            });

            //Valójában itt nyitjuk meg az új kis ablakot, eddig csak definiáltuk a részeit
            this._oCreateDialog.open();
        }
    });
});