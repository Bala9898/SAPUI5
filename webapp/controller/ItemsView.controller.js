sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/UIComponent",
  "sap/ui/core/Item",
  "sap/ui/core/Fragment",
  "sap/m/MessageBox",
  "sap/m/Dialog",
  "sap/m/TextArea",
  "sap/m/Input",
  "sap/m/library",           
  "sap/m/Label",
  "sap/m/VBox",
  "sap/m/DatePicker",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/FilterType",
  "sap/m/Button"
], (BaseController, UIComponent, Item, Fragment, MessageBox, Dialog, TextArea, Input, mLibrary, Label, VBox, DatePicker, Filter, FilterOperator, FilterType, Button) => {
    "use strict";
    
    const InputType = mLibrary.InputType;
    
    return BaseController.extend("bbroadr.controller.ItemsView", {
      onInit: function () {
        const oRouter = UIComponent.getRouterFor(this);
        oRouter.getRoute("RouteItemsView").attachPatternMatched(this._onRouteMatched, this);

        var oControlModel = new sap.ui.model.json.JSONModel({
          open: false,
          uOpen: false,
          dOpen: false
        });
        this.getView().setModel(oControlModel, "control");

        var oHeaderModel = new sap.ui.model.json.JSONModel({
          username: "",
          zyear: "",
          zmonth: "",
          lp: ""
        });
        this.getView().setModel(oHeaderModel, "header");

        var oTable = this.byId("itemsTable");
        oTable.attachSelectionChange(this.onSelectionChange, this);
      },
      


      //Igazából filterezés segítségével jelenítjük meg a megfelelő tételeket az adott fejsorhoz és figyeljük, hogy amibe belenavigáltunk az OPEN státuszú-e
      _onRouteMatched: function (oEvent) {
        //Bejövő adatok  
        var oArgs = oEvent.getParameter("arguments");
        var sZyear = oArgs.Zyear;
        var sZmonth = oArgs.Zmonth;
        var sLicenseplate = oArgs.Licenseplate;
        var sUsername = oArgs.Username;

        var oHModel = this.getView().getModel("header");
        oHModel.setProperty("/username", sUsername);
        oHModel.setProperty("/zyear", sZyear);
        oHModel.setProperty("/zmonth", sZmonth);
        oHModel.setProperty("/lp", sLicenseplate);
        
        var oView = this.getView();
        var oList = oView.byId("itemsTable");
        var oBinding = oList.getBinding("items");
        
        //Megfelelő filterezés
        var oFilter = [
          new Filter("Username", FilterOperator.EQ, sUsername),
          new Filter("Zyear", FilterOperator.EQ, sZyear),
          new Filter("Zmonth", FilterOperator.EQ, sZmonth),
          new Filter("Licenseplate", FilterOperator.EQ, sLicenseplate)
        ];
        oBinding.filter(oFilter);

        //Gombokfunkciókhoz "control" model állítása
        var oCModel = this.getView().getModel("control");
        var sStatus = oArgs.Status;

        //Ha OPEN fejsorba navigáltunk, akkor lehet használni a gombokat
        if (sStatus === "OPEN") {
          oCModel.setProperty("/open", true);
        }
        //Egyébként pedig nem
        else {
          oCModel.setProperty("/open", false);
        }
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
                bSingleOpen = true && oCModel.getProperty("open");
                bAllOpen = true && oCModel.getProperty("open");
            }
            //Ha hosszabb, akkor nem updatelhető
            else {
                bSingleOpen = false;
                bAllOpen = true && oCModel.getProperty("open");
                
            }
        }

        //Beállítjuk a local modelen, hogy használhatóak-e a gombok, vagy sem
        oCModel.setProperty("/dOpen", bAllOpen);
        oCModel.setProperty("/uOpen", bSingleOpen);
      },


//**************************************************************************************************************************************************************************


//Gomb funkciók
      onBack: function() {
        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        oRouter.navTo("RouteView1", {}, true);
      },

      //Új tételsor létrehozása
      onCreateItem: function () {
        this._showCreateDialog();
      },

      //Tétel(ek) törlése
      onDeleteItem: function () {
        const oView = this.getView();
        var oModel = oView.getModel();
        const oTable = oView.byId("itemsTable");
        var aSelectedItems = oTable.getSelectedItems();

        sap.ui.core.BusyIndicator.show(0);
        //Végig loopolunk a kiválasztott sorokon
        aSelectedItems.forEach(oItem => {
          var oCtx = oItem.getBindingContext();
          var sPath = oCtx.getPath();

          //Majd töröljük azokat
          oModel.remove(sPath, {
            success: () => {},
            error: (oError) => {
                MessageBox.error("Hiba történt a törlés során.");
                console.error(oError);
            }
          });
        });

        sap.ui.core.BusyIndicator.hide();
        MessageBox.success(aSelectedItems.length + " sor törölve lett.");
      },


//**************************************************************************************************************************************************************************
      

//Dialogok
//Create dialog
      _showCreateDialog() {
        const oView = this.getView();
        const oModel = oView.getModel();
        const oHModel = oView.getModel("header");
        const sZyear = oHModel.getProperty("/zyear");
        const sZmonth = oHModel.getProperty("/zmonth");
        var oMinDate = new Date(parseInt(sZyear), parseInt(sZmonth) - 1, 1);
        var oMaxDate = new Date(parseInt(sZyear), parseInt(sZmonth), 0);

        //Többszörös példányosítás megelőzése
        if (this._oCreateDialog) {
            this._oCreateDialog.destroy();
        }

        //Beviteli mezők definiálása, ahova az adatokat lehet írni
        this.oInputFrom = new Input("fromCreateInput", {
            placeholder: "Honnan",
            type: InputType.String/*,
            showSuggestion: true,
            showValueHelp: true,
            valueHelpRequest: this.onCreateValueHelpRequest.bind(this),
            suggestionItems: {
                path: "/ZbbvhAddresslistSet",
                template: new Item({
                    text: "{SerialNumber}"
                })
            }*/
        });            

        this.oInputTo = new Input("toCreateInput", {
          placeholder: "Honnan",
          type: InputType.String/*,
          showSuggestion: true,
          showValueHelp: true,
          valueHelpRequest: this.onCreateValueHelpRequest.bind(this),
          suggestionItems: {
              path: "/ZbbvhAddresslistSet",
              template: new Item({
                  text: "{SerialNumber}"
              })
          }*/
        });

        this.oInputDate = new DatePicker("dateCreateDP", {
          minDate: oMinDate,
          maxDate: oMaxDate,
          valueFormat: "yyyy-MM-dd",
          displayFormat: "yyyy.MM.dd",
          value: this.formatDateToString(oMinDate)
        });

        this.oInputDistance = new Input("distanceCreateInput", {
          placeholder: "Távolság",
          type: InputType.String
        });

        this.oInputNote = new Input("noteCreateInput", {
          placeholder: "Jegyzet",
          type: InputType.String
        });

        //Content létrehozása a dialoghoz
        const oDialogContent = new VBox({
            items: [
                new Label({ text: "Honnan cím" }),
                this.oInputFrom,
                new Label({ text: "Hova cím" }),
                this.oInputTo,
                new Label({ text: "Dátum" }),
                this.oInputDate,
                new Label({ text: "Távolság" }),
                this.oInputDistance,
                new Label({ text: "Jegyzet" }),
                this.oInputNote
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
                    var sFrom = this.oInputFrom.getValue();
                    var sTo = this.oInputTo.getValue();
                    var sDate = this.toSAPDateFormat(this.oInputDate.getDateValue());
                    var sDist = this.oInputDistance.getValue();
                    var sNote = this.oInputNote.getValue();

                    //Új rekord
                    const oNewEntry = {
                        Username: oHModel.getProperty("/username"),
                        Zyear: oHModel.getProperty("/zyear"),
                        Zmonth: oHModel.getProperty("/zmonth"),
                        Licenseplate: oHModel.getProperty("/lp"),
                        Zfrom: sFrom, 
                        Zto: sTo,
                        Zdate: sDate,
                        Distance: sDist,
                        Note: sNote
                    };
                    
                    // Létrehozás az OData modellen
                    oModel.create("/ItemSet", oNewEntry, {
                        success: function () {
                            MessageBox.success("Új tétel sor sikeresen létrehozva.", {
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


//**************************************************************************************************************************************************************************


//Value help rendszám táblákhoz
      onAddressValueHelpRequest: function (oEvent) {
        var sInputValue = oEvent.getSource().getValue(),
          oView = this.getView();

        if (!this._pValueHelpDialog) {
          this._pValueHelpDialog = Fragment.load({
            id: oView.getId(),
            name: "bbroadr.view.fragments.AddressValueHelpDialog",
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

      onAddressValueHelpSearch: function (oEvent) {
        var sValue = oEvent.getParameter("value").toUpperCase();
        var oFilter = new Filter("Licenseplate", FilterOperator.Contains, sValue);

        oEvent.getSource().getBinding("items").filter([oFilter]);
      },

      onAddressValueHelpClose: function (oEvent) {
        var oSelectedItem = oEvent.getParameter("selectedItem");
        oEvent.getSource().getBinding("items").filter([]);

        if (!oSelectedItem) {
          return;
        }

        this.byId("lpInput").setValue(oSelectedItem.getTitle());

              this.handleFilter({ getParameter: () => oSelectedItem.getTitle() });
      },


//**************************************************************************************************************************************************************************


//Formatterek
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

      //DatePickerhez dátum formázás
      formatDateToString: function(oDate) {
        var yyyy = oDate.getFullYear();
        var mm = (oDate.getMonth() + 1).toString().padStart(2, "0");
        var dd = oDate.getDate().toString().padStart(2, "0");
        return yyyy + "-" + mm + "-" + dd;
      },

      //Dátum formázás backendre mentéshez
      toSAPDateFormat: function(date) {
        const timestamp = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
        return `/Date(${timestamp})/`;
      },
      
    });
  });