sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/TextArea",
    "sap/m/Button"
], (Controller, UIComponent, MessageToast, MessageBox, Dialog, TextArea, Button) => {
    "use strict";

    return Controller.extend("bbroadr.controller.View1", {
        onInit() {},

        onItemPress(oEvent) {
            const oItem = oEvent.getSource();
            const oContext = oItem.getBindingContext();
            const oData = oContext.getObject();
            const sPath = oContext.getPath();
            const router = UIComponent.getRouterFor(this);
            router.navTo("RouteItemsView", {});
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
                    press: () => {
                        const sReason = oTextArea.getValue().trim();
                        this._oReasonDialog.close();
                        MessageToast.show(sAction + " végrehajtva az indoklással: " + sReason);
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
        
        handleStatus : function(oEvent) {
            var oHeadCIL = this.getView().byId("ColumnListItem");
            var oItemsBindig = oHeadCIL.getBinding("items");

            var sValue = oEvent.oSource.getValue();

            if (sValue === "" || sValue === null || sValue === undefined) {
                oItemsBindig.filter([]);
                return;
            }

            var oStatusFilter = new sap.ui.model.Filter("StatusCell", sap.ui.model.FilterOperator.Contains, sValue);
            var oFilter = new sap.ui.model.Filter([oStatusFilter], false);

            oItemsBindig.filter(oFilter);
        }
       
    });
});