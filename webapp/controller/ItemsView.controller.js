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
      
      //Igazából filterezés segítségével jelenítjük meg a megfelelő tételeket az adott fejsorhoz
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
      },

      //Tételazonosító formázás
      formatItemId: function(value) {
        const n = parseInt(value);
        return n;
      },

      //Dátum formázás 'yyyy.mm.dd' formátumra
      formatDate: function(date) {
        if (!date) return "";
    
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
    
        return `${year}.${month}.${day}`;
      },
      
      //A forint esetén megfelelő formátumra hozzuk a pénzt, egyébként pedig visszaadjuk 2 tizedesjeggyel
      formatHufPrice: function(value, currency) {
        if (typeof value !== "string") {
            value = value == null ? "" : String(value);
        }

        value = value.replace(/,/g, '');
        const n = parseFloat(value);

        if (isNaN(n)) {
            return "0";
        }

        if (currency === "HUF"){
            return (n / 100).toFixed(0) + " " + currency;
        }

        return n.toFixed(2) + " " + currency;
      }    
    
    });
  });