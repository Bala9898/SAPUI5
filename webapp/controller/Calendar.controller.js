sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/core/library",
	"sap/ui/core/Fragment",
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/format/DateFormat"
],
function(UIComponent, coreLibrary, Fragment, Controller, DateFormat) {
	"use strict";

	var ValueState = coreLibrary.ValueState;

	return Controller.extend("bbroadr.controller.Calendar", {

		//Kellenek a pontos cím adatok
		onInit: function() {
			// Címek modelje (OData)
			var oAddressModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/SAP/ZBB_ROAD_REGISTER_PROJECT_SRV/",true);
			oAddressModel.read("/ZbbvhAddresslistSet", {
			  success: function (oData) {
				var oJsonModel = new sap.ui.model.json.JSONModel(oData);
				this.getView().setModel(oJsonModel, "address");
			  }.bind(this),
			  error: function (oError) {
				console.error("Nem sikerült a címeket betölteni.\n", oError);
			  }
			});

			//Fejsor kulcsokat tartalmazó JSONModel
			var oHeaderModel = new sap.ui.model.json.JSONModel({
			username: "",
			zyear: "",
			zmonth: "",
			lp: "",
			status: ""
			});
			this.getView().setModel(oHeaderModel, "header");

			const oRouter = UIComponent.getRouterFor(this);
			oRouter.getRoute("RouteCalendarView").attachPatternMatched(this._onRouteMatched, this);
		},


      

      //Igazából filterezés segítségével jelenítjük meg a megfelelő tételeket az adott fejsorhoz és figyeljük, hogy amibe belenavigáltunk az OPEN státuszú-e
      _onRouteMatched: function (oEvent) {
        //Bejövő adatok  
        var oArgs = oEvent.getParameter("arguments");
        var sZyear = oArgs.Zyear;
        var sZmonth = oArgs.Zmonth;
        var sLicenseplate = oArgs.Licenseplate;
        var sUsername = oArgs.Username;
        var sStatus = oArgs.Status;
        
        var oHModel = this.getView().getModel("header");
        oHModel.setProperty("/username", sUsername);
        oHModel.setProperty("/zyear", sZyear);
        oHModel.setProperty("/zmonth", sZmonth);
        oHModel.setProperty("/lp", sLicenseplate);
        oHModel.setProperty("/status", sStatus);

		const startDate = new Date(sZyear, sZmonth - 1, 1);
		this.byId("SPC1").setStartDate(startDate);
      },


		//
		onBack: function() {
        const oView = this.getView();
        const oHModel = oView.getModel("header");
        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        oRouter.navTo("RouteItemsView", {
          Username: oHModel.getProperty("/username"),
          Zyear: oHModel.getProperty("/zyear"),
          Zmonth: oHModel.getProperty("/zmonth"),
          Licenseplate: oHModel.getProperty("/lp"),
          Status: oHModel.getProperty("/status")
        });
      },

		//Naptári eseményre kattintva előugrik egy kis ablak, ami az adott esemény információit mutatja
		handleAppointmentSelect: function (oEvent) {
			var oAppointment = oEvent.getParameter("appointment"),
				oView = this.getView();

			if (oAppointment === undefined) {
				return;
			}

			if (!oAppointment.getSelected() && this._pDetailsPopover) {
				this._pDetailsPopover.then(function(oResponsivePopover){
					oResponsivePopover.close();
				});
				return;
			}

			if (!this._pDetailsPopover) {
				this._pDetailsPopover = Fragment.load({
					id: oView.getId(),
					name: "bbroadr.view.fragments.Details",
					controller: this
				}).then(function(oResponsivePopover){
					oView.addDependent(oResponsivePopover);
					return oResponsivePopover;
				});
			}
			this._pDetailsPopover.then(function (oResponsivePopover) {
				oResponsivePopover.setBindingContext(oAppointment.getBindingContext());
				oResponsivePopover.openBy(oAppointment);
			});
		},

		//Ha egy napra több esemény van, mint amennyit mutatni tud a naptár, akkor belenavigál az adott napba (nézet váltás)
		handleMoreLinkPress: function(oEvent) {
			var oDate = oEvent.getParameter("date"),
				oSinglePlanningCalendar = this.getView().byId("SPC1");

			if (oDate) {
				oSinglePlanningCalendar.setStartDate(oDate); // focus on the clicked day
			}

			oSinglePlanningCalendar.setSelectedView(oSinglePlanningCalendar.getViews()[2]); // DayView
		},

		//Kis ablak bezárása
		handleCancel: function () {
			var oView = this.getView();
			var oPopover = oView.byId("detailsPopover");
			if (oPopover) {
				oPopover.close();
			}
		},



//************************************************************************************************************************************************************************************************************
		


//Időintervallum választó függvényei...
		handleDateTimePickerChange: function(oEvent) {
			var oDateTimePickerStart = this.byId("DTPStartDate"),
				oDateTimePickerEnd = this.byId("DTPEndDate"),
				oStartDate = oDateTimePickerStart.getDateValue(),
				oEndDate = oDateTimePickerEnd.getDateValue(),
				oErrorState = {errorState: false, errorMessage: ""};

			if (!oStartDate){
				oErrorState.errorState = true;
				oErrorState.errorMessage = "Válasszon dátumot!";
				this._setDateValueState(oDateTimePickerStart, oErrorState);
			} else if (!oEndDate){
				oErrorState.errorState = true;
				oErrorState.errorMessage = "Válasszon dátumot!";
				this._setDateValueState(oDateTimePickerEnd, oErrorState);
			} else if (!oEvent.getParameter("valid")){
				oErrorState.errorState = true;
				oErrorState.errorMessage = "Érvénytelen dátum!";
				if (oEvent.getSource() === oDateTimePickerStart){
					this._setDateValueState(oDateTimePickerStart, oErrorState);
				} else {
					this._setDateValueState(oDateTimePickerEnd, oErrorState);
				}
			} else if (oStartDate && oEndDate && (oEndDate.getTime() <= oStartDate.getTime())){
				oErrorState.errorState = true;
				oErrorState.errorMessage = "A kezdő dátum előbb kell, hogy legyen, mint a záró dátum.";
				this._setDateValueState(oDateTimePickerStart, oErrorState);
				this._setDateValueState(oDateTimePickerEnd, oErrorState);
			} else {
				this._setDateValueState(oDateTimePickerStart, oErrorState);
				this._setDateValueState(oDateTimePickerEnd, oErrorState);
			}
			
			this.updateButtonEnabledState(oDateTimePickerStart, oDateTimePickerEnd, this.byId("modifyDialog").getBeginButton());
		},
		
		handleDatePickerChange: function () {
			var oDatePickerStart = this.byId("DPStartDate"),
			oDatePickerEnd = this.byId("DPEndDate"),
			oStartDate = oDatePickerStart.getDateValue(),
			oEndDate = oDatePickerEnd.getDateValue(),
			bEndDateBiggerThanStartDate = oEndDate.getTime() < oStartDate.getTime(),
			oErrorState = {errorState: false, errorMessage: ""};

			if (oStartDate && oEndDate && bEndDateBiggerThanStartDate){
				oErrorState.errorState = true;
				oErrorState.errorMessage = "A kezdő dátum előbb kell, hogy legyen, mint a záró dátum.";
			}
			this._setDateValueState(oDatePickerStart, oErrorState);
			this._setDateValueState(oDatePickerEnd, oErrorState);
			this.updateButtonEnabledState(oDatePickerStart, oDatePickerEnd, this.byId("modifyDialog").getBeginButton());
		},
		
		_setDateValueState: function(oPicker, oErrorState) {
			if (oErrorState.errorState) {
				oPicker.setValueState(ValueState.Error);
				oPicker.setValueStateText(oErrorState.errorMessage);
			} else {
				oPicker.setValueState(ValueState.None);
			}
		},

		
		
//************************************************************************************************************************************************************************************************************



//Formatterek
		//Dátum formázás
		formatDate: function (oDate) {
			if (oDate) {
				var iHours = oDate.getHours(),
					iMinutes = oDate.getMinutes(),
					iSeconds = oDate.getSeconds();

				if (iHours !== 0 || iMinutes !== 0 || iSeconds !== 0) {
					return DateFormat.getDateTimeInstance({ style: "medium" }).format(oDate);
				} else  {
					return DateFormat.getDateInstance({ style: "medium" }).format(oDate);
				}
			}
		},
		
		//Honnan, hova cím formázása, hogy ne kódokat lásson a felhasználó
		formatAddressName: function(code) {
			var oView = this.getView();
			var oAddressModel = oView.getModel("address");
			
			if (!oAddressModel) return code;
			
			var aAddresses = oAddressModel.getProperty("/results");
			var oMatch = aAddresses.find(function(oAddress) {
			  return oAddress.SerialNumber === code;
			});
			
			if (oMatch) {
				var Country = oMatch.Country || "";
				var PostalC = oMatch.PostCode || "";
				var City = oMatch.City || "";
				var Street = oMatch.Street || "";
			  var HouseN = oMatch.HouseNumber || "";
			  return Country + " " + PostalC + " " + City + ", " + Street + " " + HouseN + ".";
			}
		  
			return code;
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
		  }
	});
});