sap.ui.define([
    "sap/ushell/Container",
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
], (Container, Controller, UIComponent, Item, coreLibrary, MessageToast, MessageBox, Dialog, TextArea, Input, mLibrary, Label, VBox, Select, Filter, FilterOperator, FilterType, Button, ODataModel) => {
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
                    
                        var b = true;
                        sap.ui.core.BusyIndicator.show(0);
                        
                        //Backend rész
                        var oModel = this.getView().getModel();
                        
                        //Végig loopolunk a kiválasztott sorokon
                        aSelected.forEach(oItem => {
                            var oCtx = oItem.getBindingContext();

                            var sStatus = oCtx.getProperty("Status");

                            if (sStatus !== "OPEN") {
                                // Átugorjuk ezt a sort
                                b = false;
                                return;
                            }

                            var sPath = oCtx.getPath();
                            sStatus = sAction === "Jóváhagyás" ? "APPROVED" : "DECLINED";
                        
                            var oUpdatedData = {
                                Username: oCtx.getProperty("Username"),
                                Zyear: oCtx.getProperty("Zyear"),
                                Zmonth: oCtx.getProperty("Zmonth"),
                                Licenseplate: oCtx.getProperty("Licenseplate"),
                                KmStart: oCtx.getProperty("KmStart"),
                                KmEnd: oCtx.getProperty("KmEnd"),
                                AvgFuelPrice: oCtx.getProperty("AvgFuelPrice"),
                                AvgFuelCurrency: oCtx.getProperty("AvgFuelCurrency"),
                                Status: sStatus,
                                Note: sReason,
                                Zcount: oCtx.getProperty("Zcount")
                            };                            
                                                    
                            oModel.update(sPath, oUpdatedData, {
                                success: function() {},
                                error: function(oError) {
                                    b = false;
                                }
                            });
                        });                        
                        
                        if (b === false) {
                            MessageBox.error("Csak OPEN státuszú fejsort/fejsorokat lehet jóváhagyni vagy elutasítani.");
                            sap.ui.core.BusyIndicator.hide();
                        }
                        else {
                            try
                            {
                                oModel.submitChanges();
                                MessageBox.success(`${aSelected.length} sor sikeresen ${sAction === "Jóváhagyás" ? "jóváhagyva" : "elutasítva"}.`);
                            }
                            catch (oError)
                            {
                                MessageBox.error("Hiba történt az entitás frissítésekor.\nRészletek: " + (oError?.message || oError));
                            }
                            finally
                            {
                                sap.ui.core.BusyIndicator.hide();
                            }
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

            //console.log(oView.byId("headerTable").getBinding("items"));
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
            this.oInputYear = new Input("inputYear", {
                placeholder: "Pl. 2025",
                type: InputType.String
            });
        
            this.oInputMonth = new Input("inputMonth", {
                placeholder: "Pl. 07",
                type: InputType.String
            });

            this.oInputLp = new Input("inputLp", {
                placeholder: "Pl. ABC123",
                type: InputType.String
            });
        
            this.oInputKmStart = new Input("inputKmStart", {
                type: InputType.Number
            });
        
            this.oInputAvgPrice = new Input("inputAvgPrice", {
                type: InputType.Number
            });
        
            this.oSelectCurr = new Select("inputCurr", {
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
                    this.oInputYear,
                    new Label({ text: "Hónap" }),
                    this.oInputMonth,
                    new Label({ text: "Rendszámtábla" }),
                    this.oInputLp,
                    new Label({ text: "Kezdő kilométeróra állás" }),
                    this.oInputKmStart,
                    new Label({ text: "Üzemanyag átlagár" }),
                    this.oInputAvgPrice,
                    new Label({ text: "Pénznem" }),
                    this.oSelectCurr
                ]
            }).addStyleClass("sapUiSmallMargin");

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
                        //Adatok az új rekordhoz
                        var sU = "BBARISCHIN"; //|| sap.ushell?.Container?.getUser?.().getId() valamiért nem a sajátomat adja vissza;
                        var sY = this.oInputYear.getValue();
                        var sM = this.oInputMonth.getValue();
                        var sLp = this.oInputLp.getValue();
                        var iKm = parseInt(this.oInputKmStart.getValue(), 10);
                        var sCurr = this.oSelectCurr.getSelectedKey();
                        var fAvg = this.oInputAvgPrice.getValue();
                        if (sCurr === "HUF")
                        {
                            fAvg = fAvg + "00";
                        }
                        
                        //Új rekord
                        const oNewEntry = {
                            Username: sU, 
                            Zyear: sY, 
                            Zmonth: sM, 
                            Licenseplate: sLp,
                            KmStart: iKm,
                            KmEnd: iKm,
                            AvgFuelPrice: fAvg,
                            AvgFuelCurrency: sCurr,
                            Status: "OPEN",
                            Note: "",
                            Zcount: 0
                        };
                        
                        // Létrehozás az OData modellen
                        oModel.create("/HeaderSet", oNewEntry, {
                            success: function () {
                                MessageToast.show("A fejsor sikeresen létrehozva.");
                            },
                            error: function (oError) {
                                MessageBox.error("Hiba történt a létrehozás során.\nHiba: " + oError?.message || oError);
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
        },

        //Ne a teljes szöveget mutassa a jegyzetnél
        truncateNote: function(sText) {
            if (!sText) return "";
            return sText.length > 30 ? sText.substring(0, 30) + "..." : sText;
        }

    });
});