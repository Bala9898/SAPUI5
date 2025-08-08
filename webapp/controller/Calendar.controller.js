sap.ui.define([
	"sap/ui/core/library",
	"sap/ui/core/Fragment",
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/format/DateFormat",
	"sap/ui/model/json/JSONModel",
	"sap/ui/unified/library",
	"sap/m/library",
	"sap/ui/core/date/UI5Date"
],
function(coreLibrary, Fragment, Controller, DateFormat) {
	"use strict";

	var ValueState = coreLibrary.ValueState;

	return Controller.extend("bbroadr.controller.Calendar", {

		onInit: function() {
			// Address Model (OData)
			var oAddressModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/SAP/ZBB_ROAD_REGISTER_PROJECT_SRV/",true);
			oAddressModel.read("/ZbbvhAddresslistSet", {
			  success: function (oData) {
				var oJsonModel = new sap.ui.model.json.JSONModel(oData);
				this.getView().setModel(oJsonModel, "address");
			  }.bind(this),
			  error: function (oError) {
				console.error("Failed to load address list", oError);
			  }
			});
		},

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

		handleMoreLinkPress: function(oEvent) {
			var oDate = oEvent.getParameter("date"),
				oSinglePlanningCalendar = this.getView().byId("SPC1");

			oSinglePlanningCalendar.setSelectedView(oSinglePlanningCalendar.getViews()[2]); // DayView

			this.getView().getModel().setData({ startDate: oDate }, true);
		},

		handleCancel: function (oEvent) {
			oEvent.getSource().getParent().close();
		},

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

		_setHoursToZero: function (oDate) {
			oDate.setHours(0, 0, 0, 0);
		},

		handleStartDateChange: function (oEvent) {
			var oStartDate = oEvent.getParameter("date");
		},

		handleDateTimePickerChange: function(oEvent) {
			var oDateTimePickerStart = this.byId("DTPStartDate"),
				oDateTimePickerEnd = this.byId("DTPEndDate"),
				oStartDate = oDateTimePickerStart.getDateValue(),
				oEndDate = oDateTimePickerEnd.getDateValue(),
				oErrorState = {errorState: false, errorMessage: ""};

			if (!oStartDate){
				oErrorState.errorState = true;
				oErrorState.errorMessage = "Please pick a date";
				this._setDateValueState(oDateTimePickerStart, oErrorState);
			} else if (!oEndDate){
				oErrorState.errorState = true;
				oErrorState.errorMessage = "Please pick a date";
				this._setDateValueState(oDateTimePickerEnd, oErrorState);
			} else if (!oEvent.getParameter("valid")){
				oErrorState.errorState = true;
				oErrorState.errorMessage = "Invalid date";
				if (oEvent.getSource() === oDateTimePickerStart){
					this._setDateValueState(oDateTimePickerStart, oErrorState);
				} else {
					this._setDateValueState(oDateTimePickerEnd, oErrorState);
				}
			} else if (oStartDate && oEndDate && (oEndDate.getTime() <= oStartDate.getTime())){
				oErrorState.errorState = true;
				oErrorState.errorMessage = "Start date should be before End date";
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
				oErrorState.errorMessage = "Start date should be before End date";
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