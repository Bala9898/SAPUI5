sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/core/Item",
    "sap/ui/core/library",
	"sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/TextArea",
    "sap/m/Input",
    "sap/m/library",           
    "sap/m/Label",
    "sap/m/VBox",
    "sap/m/Select",
    "sap/m/DatePicker",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/FilterType",
    "sap/m/Button"
], (Controller, UIComponent, Item, coreLibrary, Fragment, MessageBox, Dialog, TextArea, Input, mLibrary, Label, VBox, Select, DatePicker, Filter, FilterOperator, FilterType, Button) => {
    "use strict";

    const ValueState = coreLibrary.ValueState;
    const InputType = mLibrary.InputType;

    return Controller.extend("bbroadr.controller.View1", {
        onInit() {
            var oFilterModel = new sap.ui.model.json.JSONModel({
                status: "",
                zyear: "",
                zmonth: "",
                licenseplate: ""
            });
            this.getView().setModel(oFilterModel, "filters");

            var oControlModel = new sap.ui.model.json.JSONModel({
                open: false,
                uOpen: false
            });
            this.getView().setModel(oControlModel, "control");

            var oTable = this.byId("headerTable");
            oTable.attachSelectionChange(this.onSelectionChange, this);

            var oItemModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/SAP/ZBB_ROAD_REGISTER_PROJECT_SRV");
            this.getView().setModel(oItemModel, "Item");
        },        


//Függvényhívások
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
                Licenseplate: oData.Licenseplate,
                Status: oData.Status
            });
        },

        //Jóváhagyás gomb
        onGroupApprove() {
            this._showReasonDialog("Jóváhagyás");
        },

        //Elutasítás gomb
        onGroupReject() {
            this._showReasonDialog("Elutasítás");
        },

        //Új fejsor létrehozása
        onCreateHead: function () {
            this._showCreateDialog();
        },

        //Fejsor módosítása
        onUpdateHead: function () {
            this._showUpdateDialog();
        },

        

        //Hó végi km kalkuláció
        onCalc: function () {
            //Megszerezzük a modelt és a kiválasztott sorokat
            const oTable = this.byId("headerTable");
            const aSelectedItems = oTable.getSelectedItems();
            const oView = this.getView();
        
            var oHeaderModel = oView.getModel(); // HeaderSet model

            aSelectedItems.forEach(oItem => {
                const oCtx = oItem.getBindingContext();
                var sHeaderPath = oCtx.getPath();

                //Új rekord
                var oNewEntry = {
                    Username: oCtx.getProperty("Username"),
                    Zyear: oCtx.getProperty("Zyear"),
                    Zmonth: oCtx.getProperty("Zmonth"),
                    Licenseplate: oCtx.getProperty("Licenseplate"),
                    KmStart: oCtx.getProperty("KmStart"),
                    KmEnd: 0,
                    AvgFuelPrice: oCtx.getProperty("AvgFuelPrice"),
                    AvgFuelCurrency: oCtx.getProperty("AvgFuelCurrency"),
                    Status: oCtx.getProperty("Status"),
                    Note: oCtx.getProperty("Note"),
                    Zcount: oCtx.getProperty("Zcount")
                };
                //Módosítás az OData modellen
                oHeaderModel.update(sHeaderPath, oNewEntry, {
                    success: function () { }, 
                    error: function (oError) {
                        MessageBox.error("Hiba történt a módosítás során.\nHiba: " + oError?.message || oError, {
                            title: "Hiba"
                        });
                    }
                });
            });
        },



        //Ha változik a sorkijelölés, akkor ellenőrizzük, hogy mindegyik OPEN státuszú-e
        onSelectionChange: function (oEvent) {
            var oTable = oEvent.getSource();
            var oCModel = this.getView().getModel("control");
            var aSelectedItems = oTable.getSelectedItems();
            var bAllOpen = true;
            var bSingleOpen = true;
            
            //Ha nincs kijelölve egy sor sem, akkor false
            if (aSelectedItems.length === 0) {
                bAllOpen = false;
                bSingleOpen = false;
            }
            else {
                //Ha 1 hosszú, akkor még updatelhető is => uOpen = true
                if (aSelectedItems.length === 1) {
                    bSingleOpen = aSelectedItems.every(function (oItem) {
                        var oContext = oItem.getBindingContext();
                        return oContext.getProperty("Status") === "OPEN";
                    });
                    bAllOpen = bSingleOpen;
                }
                else {
                    bSingleOpen = false;
                    //Egyébként megnézzük összes kiválasztott sort, hogy OPEN-e
                    bAllOpen = aSelectedItems.every(function (oItem) {
                        var oContext = oItem.getBindingContext();
                        return oContext.getProperty("Status") === "OPEN";
                    });
                    
                }
            }

            //Beállítjuk a local modelen, hogy használhatóak-e a gombok, vagy sem
            oCModel.setProperty("/open", bAllOpen);
            oCModel.setProperty("/uOpen", bSingleOpen);
          },


//***************************************************************************************************************************************************************


//Value help rendszám táblákhoz
        onValueHelpRequest: function (oEvent) {
			var sInputValue = oEvent.getSource().getValue(),
				oView = this.getView();

			if (!this._pValueHelpDialog) {
				this._pValueHelpDialog = Fragment.load({
					id: oView.getId(),
					name: "bbroadr.view.fragments.ValueHelpDialog",
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					return oDialog;
				});
			}
			this._pValueHelpDialog.then(function(oDialog) {
				// Create a filter for the binding
				oDialog.getBinding("items").filter([new Filter("Licenseplate", FilterOperator.Contains, sInputValue)]);
				// Open ValueHelpDialog filtered by the input's value
				oDialog.open(sInputValue);
			});
		},

		onValueHelpSearch: function (oEvent) {
			var sValue = oEvent.getParameter("value").toUpperCase();
			var oFilter = new Filter("Licenseplate", FilterOperator.Contains, sValue);

			oEvent.getSource().getBinding("items").filter([oFilter]);
		},

		onValueHelpClose: function (oEvent) {
			var oSelectedItem = oEvent.getParameter("selectedItem");
			oEvent.getSource().getBinding("items").filter([]);

			if (!oSelectedItem) {
				return;
			}

			this.byId("lpInput").setValue(oSelectedItem.getTitle());

            this.handleFilter({ getParameter: () => oSelectedItem.getTitle() });
		},



//Create entity tweaking        
        onCreateValueHelpRequest: function (oEvent) {
            var sInputValue = oEvent.getSource().getValue(),
                oView = this.getView();

            if (!this._pValueHelpDialog) {
                this._pValueHelpDialog = Fragment.load({
                    id: oView.getId(),
                    name: "bbroadr.view.fragments.CreateValueHelpDialog",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }
            this._pValueHelpDialog.then(function(oDialog) {
                // Create a filter for the binding
                oDialog.getBinding("items").filter([new Filter("Licenseplate", FilterOperator.Contains, sInputValue)]);
                // Open ValueHelpDialog filtered by the input's value
                oDialog.open(sInputValue);
            });
        },

        onCreateValueHelpSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value").toUpperCase();
            var oFilter = new Filter("Licenseplate", FilterOperator.Contains, sValue);

            oEvent.getSource().getBinding("items").filter([oFilter]);
        },

        onCreateValueHelpClose: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            oEvent.getSource().getBinding("items").filter([]);

            if (!oSelectedItem) {
                return;
            }
            
            this.oInputLp.setValue(oSelectedItem.getTitle());
        },


//***************************************************************************************************************************************************************


//Filter
        //Összes szűrés egyben
        handleFilter: function() {
            //Adatok megszerezése
            var oView = this.getView();
            var sKey = oView.byId("StatusS").getSelectedKey();
            var mKey = oView.byId("ZmonthS").getSelectedKey();
            var oFilterModel = this.getView().getModel("filters");
            oFilterModel.setProperty("/status", sKey);
            oFilterModel.setProperty("/zmonth", mKey);
            var oStatus = oFilterModel.getProperty("/status");
            var oZmonth= oFilterModel.getProperty("/zmonth");
            var sZyear = oView.byId("ZyearDP").getValue();
            var sLicenseplate = oView.byId("lpInput").getValue().toUpperCase();
            var aFilters = [];

            //Filterek beállítása
            if (oStatus) {
                aFilters.push(new Filter("Status", FilterOperator.EQ, oStatus));
            }
            if (sZyear) {
                aFilters.push(new Filter("Zyear", FilterOperator.EQ, sZyear));
            }
            if (oZmonth) {
                aFilters.push(new Filter("Zmonth", FilterOperator.EQ, oZmonth));
            }
            if (sLicenseplate) {
                aFilters.push(new Filter("Licenseplate", FilterOperator.Contains, sLicenseplate));
            }

            //Filtering
            oView.byId("headerTable").getBinding("items").filter(aFilters, FilterType.Application);
        },
        

//***************************************************************************************************************************************************************


//Dialogok
//Create dialog
        _showCreateDialog() {
            const oView = this.getView();
            const oModel = oView.getModel();

            //Többszörös példányosítás megelőzése
            if (this._oCreateDialog) {
                this._oCreateDialog.destroy();
            }

            //Beviteli mezők definiálása, ahova az adatokat lehet írni
            this.oInputYear = new DatePicker("inputYear", {
                placeholder: "Évszám",
                displayFormat: "yyyy",
                valueFormat: "yyyy",
                value: "{Zyear}"
            });
        
            this.oInputMonth = new Select("inputMonth", {
                type: InputType.String,
                selectedKey: "{filters>/zmonth}",
                items: [
                    new Item({ key: "", text: "-- Hónap --" }),
                    new Item({ key: "01", text: "Január" }),
                    new Item({ key: "02", text: "Február" }),
                    new Item({ key: "03", text: "Március" }),
                    new Item({ key: "04", text: "Április" }),
                    new Item({ key: "05", text: "Május" }),
                    new Item({ key: "06", text: "Június" }),
                    new Item({ key: "07", text: "Július" }),
                    new Item({ key: "08", text: "Augusztus" }),
                    new Item({ key: "09", text: "Szeptember" }),
                    new Item({ key: "10", text: "Október" }),
                    new Item({ key: "11", text: "November" }),
                    new Item({ key: "12", text: "December" })
                ]
            });

            this.oInputLp = new Input("lpCreateInput", {
                placeholder: "Rendszám",
                type: InputType.String,
                showSuggestion: true,
                showValueHelp: true,
                valueHelpRequest: this.onCreateValueHelpRequest.bind(this),
                suggestionItems: {
                    path: "/ZbbvhCarsSet",
                    template: new Item({
                        text: "{Licenseplate}"
                    })
                }
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
                        var sU = sap.ushell.Container.getService("UserInfo").getId()
                        var sY = this.oInputYear.getValue();
                        var sM = this.oInputMonth.getSelectedKey();
                        var sLp = this.oInputLp.getValue().toUpperCase();
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
                                MessageBox.success("A fejsor sikeresen létrehozva.", {
                                    title: "Siker"
                                });
                            },
                            error: function (oError) {
                                MessageBox.error("Hiba történt a létrehozás során.\nHiba: " + oError?.message || oError, {
                                    title: "Hiba"
                                });
                            }
                        });
                        this._oCreateDialog.close();
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



//Update_entity dialog
        _showUpdateDialog() {
            //Megszerezzük a kiválasztott sorokat
            const oTable = this.byId("headerTable");
            const aSelected = oTable.getSelectedItems();

            //Többszörös példányosítás megelőzése
            if (this._oUpdateDialog) {
                this._oUpdateDialog.destroy();
            }

            //Beviteli mezők definiálása, ahova az adatokat lehet írni
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
                    new Label({ text: "Kezdő kilométeróra állás" }),
                    this.oInputKmStart,
                    new Label({ text: "Üzemanyag átlagár" }),
                    this.oInputAvgPrice,
                    new Label({ text: "Pénznem" }),
                    this.oSelectCurr
                ]
            }).addStyleClass("sapUiSmallMargin");

            //Létrehozzuk a felugró ablakot a szövegmezővel
            this._oUpdateDialog = new Dialog({
                title: "Fejsor módosítása",
                contentWidth: "400px",
                draggable: true,
                resizable: true,
                content: [oDialogContent],
                beginButton: new Button({
                    text: "Módosít",
                    press: () => {
                        var oModel = this.getView().getModel();
                        aSelected.forEach(oItem => {
                            var oCtx = oItem.getBindingContext();
                            var sPath = oCtx.getPath();

                            //Adatok az új rekordhoz
                            if (this.oInputKmStart.getValue() === "")
                            {
                                var iKm = oCtx.getProperty("KmStart");
                            }
                            else
                            {
                                var iKm = parseInt(this.oInputKmStart.getValue(), 10);
                            }
                            var sCurr = this.oSelectCurr.getSelectedKey();
                            if (this.oInputAvgPrice.getValue() === "")
                            {
                                var fAvg = oCtx.getProperty("AvgFuelPrice");
                            }
                            else
                            {
                                var fAvg = this.oInputAvgPrice.getValue();
                                if (sCurr === "HUF")
                                {
                                    fAvg = fAvg + "00";
                                }
                            }
                            
                            //Új rekord
                            const oNewEntry = {
                                Username: oCtx.getProperty("Username"),
                                Zyear: oCtx.getProperty("Zyear"),
                                Zmonth: oCtx.getProperty("Zmonth"),
                                Licenseplate: oCtx.getProperty("Licenseplate"),
                                KmStart: iKm,
                                KmEnd: iKm,
                                AvgFuelPrice: fAvg,
                                AvgFuelCurrency: sCurr,
                                Status: oCtx.getProperty("Status"),
                                Note: oCtx.getProperty("Note"),
                                Zcount: oCtx.getProperty("Zcount")
                            };
                            
                            //Módosítás az OData modellen
                            oModel.update(sPath, oNewEntry, {
                                success: function () {
                                    MessageBox.success("A fejsor sikeresen módosítva.", {
                                        title: "Siker"
                                    });
                                },
                                error: function (oError) {
                                    MessageBox.error("Hiba történt a módosítás során.\nHiba: " + oError?.message || oError, {
                                        title: "Hiba"
                                    });
                                }
                            });
                        });

                        
                        this._oUpdateDialog.close();
                    }                
                }),                                    
                endButton: new Button({
                    text: "Mégse",
                    //Ha nem fogadjuk el, akkor csak záródjon be a kis ablak
                    press: () => {
                        this._oUpdateDialog.close();
                    }
                }),
                //Eltűntetjük, kinullázzuk a dolgokat
                afterClose: () => {
                    this._oUpdateDialog.destroy();
                    this._oUpdateDialog = null;
                }
            });

            //Valójában itt nyitjuk meg az új kis ablakot, eddig csak definiáltuk a részeit
            this._oUpdateDialog.open();
        },



//Elfogadás/elutasítás felugró ablak
        _showReasonDialog(sAction) {
            //Megszerezzük a kiválasztott sorokat
            const oTable = this.byId("headerTable");
            const aSelected = oTable.getSelectedItems();
            
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
                            var oCtx = oItem.getBindingContext();
                            var sStatus = oCtx.getProperty("Status");
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
                                }
                            });
                        });                        
                        
                        try {
                            oModel.submitChanges();
                            MessageBox.success(`${aSelected.length} sor sikeresen ${sAction === "Jóváhagyás" ? "jóváhagyva" : "elutasítva"}.`, {
                                title: "Siker"
                            });
                        }
                        catch (oError) {
                            MessageBox.error("Hiba történt az entitás frissítésekor.\nRészletek: " + (oError?.message || oError), {
                                title: "Hiba"
                            });
                        }
                        finally {
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


//**************************************************************************************************************************************************************************************


//Formatterek:

        //Ne a teljes szöveget mutassa a jegyzetnél
        truncateNote: function(sText) {
            if (!sText) return "";
            return sText.length > 30 ? sText.substring(0, 30) + "..." : sText;
        },

        //Hónap formázása
        formatMonthText: function (value) {
            const months = {
                "01": "Január",
                "02": "Február",
                "03": "Március",
                "04": "Április",
                "05": "Május",
                "06": "Június",
                "07": "Július",
                "08": "Augusztus",
                "09": "Szeptember",
                "10": "Október",
                "11": "November",
                "12": "December"
            };
            return months[value];
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
            //Ha forint, akkor úgy formázzuk, hogy jól mutassa
            if (currency === "HUF"){
                value = value.replace(/,/g, '');
                const n = parseFloat(value);

                if (isNaN(n)) {
                    return "0";
                }
                return (n / 100).toFixed(0) + " " + currency;
            }

            //Egyéb esetekben elég float-tá alakítani
            value = value.replace(/,/g, '');
            const n = parseFloat(value);

            //Ha NaN, akkor legyen 0
            if (isNaN(n)) {
                return "0";
            }
            return n.toFixed(2) + " " + currency;
        }

    });
});