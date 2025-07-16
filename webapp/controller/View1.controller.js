sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/TextArea",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
    "sap/m/Button",
    "sap/ui/model/odata/v4/ODataModel"
], (Controller, UIComponent, MessageToast, MessageBox, Dialog, TextArea, Filter, FilterOperator, FilterType, Button, ODataModel) => {
    "use strict";

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

        //A pénz árát forint esetén megfelelő formátumra hozzuk
        formatAvgFuelPrice: function(value) {
            const n = parseFloat(value);
            if (isNaN(n)) {
                return "0";
            }
            return (n*10).toFixed(2);
        },

        //Státusz szűres (szépen működik)
        handleStatus : function() {
            var oView = this.getView();
            var sValue = oView.byId("StatusSF").getValue().toUpperCase();
            var oFilter = new Filter("Status", FilterOperator.Contains, sValue);
            
            oView.byId("headerTable").getBinding("items").filter(oFilter, FilterType.Application);
        },

        //Évszám szűres (eldobja az adatokat)
        handleZYear : function() {
            var oView = this.getView();
            var sValue = oView.byId("ZYearSF").getValue();
            var oFilter = new Filter("Zyear", FilterOperator.Contains, sValue);
            
            oView.byId("headerTable").getBinding("items").filter(oFilter, FilterType.Application);
        },

        //Hónap szűrés (nem csinál semmit)
        handleZMonth : function() {
            var oView = this.getView();
            var sValue = oView.byId("ZMonthSF").getValue();
            var oFilter = new Filter("Zmonth", FilterOperator.Contains, sValue);
            
            oView.byId("headerTable").getBinding("items").filter(oFilter, FilterType.Application);
        },

        //Rendszámtábla szűres (szépen működik)
        handleLicenseplate : function() {
            var oView = this.getView();
            var sValue = oView.byId("LicenseplateSF").getValue().toUpperCase();
            var oFilter = new Filter("Licenseplate", FilterOperator.Contains, sValue);
            
            oView.byId("headerTable").getBinding("items").filter(oFilter, FilterType.Application);
        }
       
    });
});