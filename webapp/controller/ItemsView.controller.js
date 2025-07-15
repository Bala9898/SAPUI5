sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
  ], (BaseController, UIComponent, Filter, FilterOperator) => {
    "use strict";
  
    return BaseController.extend("bbroadr.controller.ItemsView", {
      onInit: function () {
        const oRouter = UIComponent.getRouterFor(this);
        oRouter.getRoute("RouteItemsView").attachPatternMatched(this._onRouteMatched, this);
      },
      
      _onRouteMatched: function (oEvent) {
          var oArgs = oEvent.getParameter("arguments");
          var sZyear = oArgs.Zyear;
          var sZmonth = oArgs.Zmonth;
          var sLicenseplate = oArgs.Licenseplate;
      
          var oView = this.getView();
          var oList = oView.byId("itemsTable");
          var oBinding = oList.getBinding("items");
          var oFilter = [
              new Filter("Zyear", FilterOperator.EQ, sZyear),
              new Filter("Zmonth", FilterOperator.EQ, sZmonth),
              new Filter("Licenseplate", FilterOperator.EQ, sLicenseplate)
          ];
          oBinding.filter(oFilter);
      }
    
    });
  });