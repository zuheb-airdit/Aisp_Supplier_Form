sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/m/MessageBox"],
  function (Controller, MessageBox) {
    "use strict";

    return Controller.extend("com.aispsuppform.aispsupplierform.controller.InstructionView", {
      onInit: function () {
        if (!this.LoginDialog) {
          this.LoginDialog = this.loadFragment({
            name: "com.aispsuppform.aispsupplierform.fragments.Login",
          });
          let oRouter = this.getOwnerComponent().getRouter();
          // oRouter.navTo("SupplierForm")

        }
        this.LoginDialog.then(
          function (oDialog) {
            this.LoginDialog = oDialog;
            this._LoginButton = this.getView().byId("idLoginButton");
            this._GetOTPButton = this.getView().byId("idGetOTPButton");
            this.requestNo = this.getView().byId("idReq");
            this._EmailField = this.getView().byId("idEmail");
            this._OTPField = this.getView().byId("idOTP");

            this.LoginDialog.setEscapeHandler(this.onPressEscape.bind(this));
            this._LoginButton.setEnabled(false);
            this.LoginDialog.open();
            // debugger;
          }.bind(this)
        );
      },
      onEmailChange: function (oEvent) {
        const sEmail = oEvent.getParameter("value");
        const bValidEmail = this._validateEmail(sEmail);
        this._GetOTPButton.setEnabled(bValidEmail);
      },
      _validateEmail: function (sEmail) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(sEmail);
      },

      onOtpChange: function (oEvent) {
        const sOtp = oEvent.getParameter("value");
        const bValidOtp = sOtp.length === 6;
        this._LoginButton.setEnabled(bValidOtp);
      },
      onSendOtp: function () {
        const oModel = this.getOwnerComponent().getModel("pin");
        const sEmail = this.getView().byId("idEmail").getValue().trim();
        // const reqNmbr = this.getView().byId("idReq").getValue().trim();
        
        // Validation: Request Number is mandatory
       
    
        // Validation: Email format
        if (!this._validateEmail(sEmail)) {
            sap.m.MessageToast.show("Invalid email format. Please enter a valid email.");
            this.getView().byId("idEmail").setValueState(sap.ui.core.ValueState.Error);
            return;
        } else {
            this.getView().byId("idEmail").setValueState(sap.ui.core.ValueState.None);
        }
    
        // Set busy indicator
        this.LoginDialog.setBusy(true);
    
        // Payload for API
        let payLD = {
            "vendorEmail": sEmail,
        };
    
        oModel.create(
            "/GeneratePin",
            payLD,
            {
                success: function (oRes) {
                    this.LoginDialog.setBusy(false);
                    this.getView().byId("idOTP").setEnabled(true);
                    this._EmailField.setEnabled(false);
                    sap.m.MessageToast.show(`OTP Sent Successfully to ${sEmail}`);
                }.bind(this),
                error: function (oErr) {
                    this.LoginDialog.setBusy(false);
                    let sErrorMessage = "Error in sending OTP. Please check Email and try again";
                    
                    try {
                        const oErrorResponse = JSON.parse(oErr.responseText);
                        sErrorMessage = oErrorResponse.error?.message?.value || sErrorMessage;
                    } catch (e) {
                        console.error("Error parsing response:", e);
                    }
    
                    MessageBox.error(sErrorMessage);
                }.bind(this),
            }
        );
    }
    ,

      onVerifyEmail: function () {
        const oModel = this.getOwnerComponent().getModel("pin");
        this._EMAIL = this._EmailField.getValue();
        this._OTP = this._OTPField.getValue();
        // this.req = this.requestNo.getValue();
        this.getView().setBusy(true);
        const oPIN = {
          vendorEmail: this._EMAIL,
          securityPin: this._OTP,

        };
        if (this._OTP.length === 6) {
          oModel.create("/ValidatePin", oPIN, {
            success: function (oRes) {
              this.getView().setBusy(false);
              this.LoginDialog.close();
              this.LoginDialog.destroy();
              this.getView().byId("idNextButton").setEnabled(true);
            }.bind(this),
            error: function (oErr) {
              this.getView().setBusy(false);
              let sErrorMessage =
                "Error in sending OTP. Please check Email and try again";
              try {
                const oErrorResponse = JSON.parse(oErr.responseText);
                sErrorMessage =
                  oErrorResponse.error?.message?.value || sErrorMessage;
              } catch (e) {
                console.error("Error parsing response:", e);
              }

              MessageBox.error(sErrorMessage);
            }.bind(this),
          });
        }
      },
      onGoToRegistrationPage: function (oEvent) {
        const oRouter = this.getOwnerComponent().getRouter();
        const sEmail = this._EMAIL; 
        oRouter.navTo("SupplierForm", { 
            Email: sEmail, 
        });
    },
    
      onPressEscape: function (oPromise) {
        oPromise.reject();
      },
    });
  }
);