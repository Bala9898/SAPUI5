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
    "sap/m/Button"
], (Controller, UIComponent, MessageToast, MessageBox, Dialog, TextArea, Filter, FilterOperator, FilterType, Button) => {
    "use strict";

    return Controller.extend("bbroadr.controller.View1", {
        onInit() {},

        onItemPress(oEvent) {
            const oItem = oEvent.getSource();
            const oContext = oItem.getBindingContext();
            const oData = oContext.getObject();
            const sPath = oContext.getPath();
            const router = UIComponent.getRouterFor(this);
            router.navTo("RouteItemsView", {
                Zyear: oData.Zyear,
                Zmonth: oData.Zmonth,
                Licenseplate: oData.Licenseplate
            });
        },

        onGroupApprove() {
            this._showReasonDialog("Jóváhagyás");
        },

        onGroupReject() {
            this._showReasonDialog("Elutasítás");
        },

        _showReasonDialog(sAction) {
            
            const oTable = this.byId("headerTable");
            const aSelected = oTable.getSelectedItems();

            if (aSelected.length === 0) {
                MessageBox.warning("Kérlek, jelölj ki legalább egy sort!");
                return;
            }

            if (this._oReasonDialog) {
                this._oReasonDialog.destroy();
            }

            const oTextArea = new TextArea({
                width: "100%",
                placeholder: "Add meg az indoklást...",
                liveChange: function (oEvent) {
                    const sValue = oEvent.getParameter("value");
                    this.getParent().getBeginButton().setEnabled(sValue.trim().length > 0);
                }
            });

            this._oReasonDialog = new Dialog({
                title: sAction,
                content: [oTextArea],
                beginButton: new Button({
                    text: "OK",
                    enabled: false,
                    press: async () => {
                        const sReason = oTextArea.getValue().trim();
                        this._oReasonDialog.close();
                    
                        sap.ui.core.BusyIndicator.show(0);
                        
                        const oModel   = this.getView().getModel();
                        const sGroupId    = "massAction";
                    
                        aSelected.forEach(oItem => {
                            const oCtx = oItem.getBindingContext(); // V4 binding context!
                            
                            // Módosítás a lokális contexten
                            oCtx.setProperty("Note", sReason, sGroupId);
                            //oCtx.setProperty("Status", sAction);
                    
                            // V4: módosítás elküldése a szerverre
                            //aPromises.push(oCtx.submitChanges());
                        });
                    
                        try {
                            await oModel.submitBatch(sGroupId);
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
                    press: () => {
                        this._oReasonDialog.close();
                    }
                }),
                afterClose: () => {
                    this._oReasonDialog.destroy();
                    this._oReasonDialog = null;
                }
            });

            this._oReasonDialog.open();
        },

        formatAvgFuelPrice: function(value) {
            const n = parseFloat(value);
            if (isNaN(n)) {
                return "0";
            }
            return (n*10).toFixed(2);
        },

        handleStatus : function() {
            var oView = this.getView();
            var sValue = oView.byId("StatusSF").getValue().toUpperCase();
            var oFilter = new Filter("Status", FilterOperator.Contains, sValue);
            
            oView.byId("headerTable").getBinding("items").filter(oFilter, FilterType.Application);
        },

        handleZYear : function() {
            var oView = this.getView();
            var sValue = oView.byId("ZYearSF").getValue();
            var oFilter = new Filter("Zyear", FilterOperator.Contains, sValue);
            
            oView.byId("headerTable").getBinding("items").filter(oFilter, FilterType.Application);
        },

        handleZMonth : function() {
            var oView = this.getView();
            var sValue = oView.byId("ZMonthSF").getValue();
            var oFilter = new Filter("Zmonth", FilterOperator.Contains, sValue);
            
            oView.byId("headerTable").getBinding("items").filter(oFilter, FilterType.Application);
        },

        handleLicenseplate : function() {
            var oView = this.getView();
            var sValue = oView.byId("LicenseplateSF").getValue().toUpperCase();
            var oFilter = new Filter("Licenseplate", FilterOperator.Contains, sValue);
            
            oView.byId("headerTable").getBinding("items").filter(oFilter, FilterType.Application);
        }
       
    });
});