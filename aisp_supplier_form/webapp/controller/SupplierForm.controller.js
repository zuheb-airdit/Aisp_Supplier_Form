sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/m/MessageBox",
        "sap/ui/model/json/JSONModel",
        "sap/ui/layout/form/SimpleForm",
        "sap/m/Label",
        "sap/m/Input",
        "sap/m/Button",
        "sap/m/Toolbar",
        "sap/m/ToolbarSpacer",
        "sap/m/Title",
        "sap/m/ComboBox",
        "sap/m/VBox",
        "sap/m/RadioButton",
        "sap/m/RadioButtonGroup",
        "sap/m/Table",
        "sap/m/Column",
        "sap/m/Text",
        "sap/ui/unified/FileUploader",
        "sap/ui/core/Core"

    ],
    function (Controller, MessageBox, JSONModel, SimpleForm, Label, Input, Button, Toolbar, ToolbarSpacer, Title, ComboBox, VBox, RadioButton, RadioButtonGroup, Table, Column, Text, FileUploader, Core) {
        "use strict";

        return Controller.extend("com.aispsuppform.aispsupplierform.controller.SupplierForm", {
            onInit: function () {
                let oModel = this.getOwnerComponent().getModel("admin");
                let mainModel = this.getOwnerComponent().getModel();
                this.getView().setModel(mainModel, "regModel");
                let formModel = this.getOwnerComponent().getModel("formData");
                this.getView().setModel(formModel, "formDataModel");
                this.getView().setModel(oModel);
                let oRegModel = this.getOwnerComponent().getModel("registration-manage");
                this.getView().setModel(oRegModel, "oRegModel");
                this._initializeDisclosureModel();
                this.getView().byId("vendorWizard").getSteps()[0].setValidated(true);
                this.getOwnerComponent()
                    .getRouter()
                    .getRoute("SupplierForm")
                    .attachPatternMatched(this._onRouteMatchedwithoutid, this);
                this.getView().byId("vendorWizard").getSteps()[0].setValidated(true);
            },

            _initializeDisclosureModel: function () {
                var oDisclosureModel = new sap.ui.model.json.JSONModel({});
                this.getView().setModel(oDisclosureModel, "disclosureModel");
                console.log("Disclosure model initialized:", oDisclosureModel.getData());
            },

            _onRouteMatchedwithoutid: function (oEvent) {
                var oArguments = oEvent.getParameter("arguments");
                this._EMAIL = oArguments.Email;
                let oRegModel = this.getView().getModel("regModel");
                let oModel = this.getView().getModel();
                console.log("Fetching registration data for Email:", this._EMAIL);

                // First OData call to get registration data
                oRegModel.read("/RequestInfoByRegId", {
                    filters: [new sap.ui.model.Filter("REGISTERED_ID", sap.ui.model.FilterOperator.EQ, this._EMAIL)],
                    success: function (regData) {
                        console.log("Registration data response:", regData);
                        var registration = regData.results && regData.results.length > 0 ? regData.results[0] : null;
                        this.responseData = { ...registration }
                        if (!registration) {
                            console.error("No registration data found for email:", this._EMAIL);
                            sap.m.MessageBox.error("No registration data found for the provided email.");
                            return;
                        }

                        // Extract Company Code and Request Type
                        var companyCode = registration.COMPANY_CODE || "1000";
                        var requestType = registration.REQUEST_TYPE || "Create Normal";
                        this.status = registration.STATUS;
                        // Prepare filters for FieldConfig call
                        var oFilters = [
                            new sap.ui.model.Filter("COMPANY_CODE", sap.ui.model.FilterOperator.EQ, companyCode),
                            new sap.ui.model.Filter("REQUEST_TYPE", sap.ui.model.FilterOperator.EQ, requestType)
                        ];

                        // Second OData call to get FieldConfig with filters
                        oModel.read("/FieldConfig", {
                            filters: oFilters,
                            success: function (res) {
                                console.log("FieldConfig response:", res);
                                var fieldConfig = res.results || res.value || res;
                                if (!fieldConfig || (Array.isArray(fieldConfig) && fieldConfig.length === 0)) {
                                    console.error("No field configuration data received");
                                    sap.m.MessageBox.error("No field configuration data available.");
                                    return;
                                }

                                var formDataModel = this.buildFormDataBySectionCategory(fieldConfig);
                                console.log("Form data model:", formDataModel);

                                var oFormDataModel = new sap.ui.model.json.JSONModel(formDataModel);
                                this.getView().setModel(oFormDataModel, "formDataModel");
                                let data = oFormDataModel.getData();
                                this.createDynamicForm(data);
                            }.bind(this),
                            error: function (err) {
                                console.error("Error fetching FieldConfig:", err);
                                sap.m.MessageBox.error("Failed to load field configuration: " + err.message);
                            }.bind(this)
                        });
                    }.bind(this),
                    error: function (err) {
                        console.error("Error fetching Registration data:", err);
                        sap.m.MessageBox.error("Failed to load registration data: " + err.message);
                    }.bind(this)
                });
            },

            buildFormDataBySectionCategory: function (fields) {
                const model = {
                    Attachments: [] // Initialize Attachments at the root level
                };
                console.log("Building form data from fields:", fields);

                fields.forEach(field => {
                    const section = field.SECTION;
                    const category = field.CATEGORY;
                    const key = field.FIELD_PATH;

                    if (section === "Attachments" && field.IS_VISIBLE) {
                        model.Attachments.push({
                            title: field.FIELD_LABEL,
                            description: "",
                            fileName: "",
                            uploaded: false,
                            fieldPath: field.FIELD_PATH,
                            fieldId: field.FIELD_ID,
                            imageUrl: "" // Add imageUrl for base64 data
                        });
                        return;
                    }

                    if (!model[section]) model[section] = {};
                    if (!model[section][category]) {
                        if (category === "Address") {
                            model[section][category] = [{ ADDRESS_TYPE: "Primary" }];
                        } else if (category === "Primary Bank details") {
                            model[section][category] = [{ BANK_TYPE: "Primary" }];
                        } else {
                            model[section][category] = {};
                        }
                    }

                    if (category === "Address" && key !== "ADDRESS_TYPE") {
                        model[section][category][0][key] = {
                            label: field.FIELD_LABEL,
                            mandatory: !!field.IS_MANDATORY,
                            visible: !!field.IS_VISIBLE,
                            value: ""
                        };
                    } else if (category === "Primary Bank details" && key !== "BANK_TYPE") {
                        model[section][category][0][key] = {
                            label: field.FIELD_LABEL,
                            mandatory: !!field.IS_MANDATORY,
                            visible: !!field.IS_VISIBLE,
                            value: ""
                        };
                    } else if (category !== "Address" && category !== "Primary Bank details") {
                        model[section][category][key] = {
                            label: field.FIELD_LABEL,
                            mandatory: !!field.IS_MANDATORY,
                            visible: !!field.IS_VISIBLE,
                            description: field.DESCRIPTION,
                            value: ""
                        };
                    }
                });

                if (this.status === 7) {
                    const r = this.responseData;                         // shorthand

                    /* === Supplier Information ================================= */
                    const sInfo = model["Supplier Information"];
                    if (sInfo) {
                        /* top block ------------------------------------------------*/
                        const sup = sInfo["Supplier Information"];
                        if (sup) {
                            sup["VENDOR_NAME1"].value = r.VENDOR_NAME1 || "";
                            sup["WEBSITE"].value = r.WEBSITE || "";
                            sup["REGISTERED_ID"].value = r.REGISTERED_ID || "";
                        }
                        /* address --------------------------------------------------*/
                        const addressRows = sInfo["Address"] || [];
                        const addressResults = r.TO_ADDRESS?.results || [];

                        /* -- primary row (index 0) -- */
                        if (addressRows[0] && addressResults[0]) {
                            const src = addressResults[0];
                            const trg = addressRows[0];

                            trg.ADDRESS_TYPE = "Primary";
                            trg["HOUSE_NUM1"].value = src.STREET ?? "";
                            trg["STREET1"].value = src.STREET1 ?? "";
                            trg["STREET2"].value = src.STREET2 ?? "";
                            trg["STREET3"].value = src.STREET3 ?? "";
                            trg["STREET4"].value = src.STREET4 ?? "";
                            trg["COUNTRY"].value = src.COUNTRY ?? "";
                            trg["STATE"].value = src.STATE ?? "";
                            trg["CITY"].value = src.CITY ?? "";
                            trg["POSTAL_CODE"].value = src.POSTAL_CODE ?? "";
                            trg["EMAIL"].value = src.EMAIL ?? "";
                            trg["CONTACT_NO"].value = src.CONTACT_NO ?? "";
                        }

                        /* -- optional “Other Office Address” row (index 1) -- */
                        if (addressResults[1]) {
                            if (!addressRows[1]) {
                                // deep-clone the structure of row 0
                                const copy = JSON.parse(JSON.stringify(addressRows[0]));
                                // clear the values
                                Object.keys(copy).forEach(k => { if (k !== "ADDRESS_TYPE") copy[k].value = ""; });
                                copy.ADDRESS_TYPE = "Other Office Address";
                                addressRows.push(copy);               // <-- NOW the array has two objects
                            }

                            const src = addressResults[1];
                            const trg = addressRows[1];

                            trg.ADDRESS_TYPE = "Other Office Address";
                            trg["HOUSE_NUM1"] = trg["HOUSE_NUM1"] || { value: "" };
                            trg["STREET1"] = trg["STREET1"] || { value: "" };
                            trg["STREET2"] = trg["STREET2"] || { value: "" };
                            trg["STREET3"] = trg["STREET3"] || { value: "" };
                            trg["STREET4"] = trg["STREET4"] || { value: "" };
                            trg["COUNTRY"] = trg["COUNTRY"] || { value: "" };
                            trg["STATE"] = trg["STATE"] || { value: "" };
                            trg["CITY"] = trg["CITY"] || { value: "" };
                            trg["POSTAL_CODE"] = trg["POSTAL_CODE"] || { value: "" };
                            trg["EMAIL"] = trg["EMAIL"] || { value: "" };
                            trg["CONTACT_NO"] = trg["CONTACT_NO"] || { value: "" };

                            trg["HOUSE_NUM1"].value = src.STREET ?? "";
                            trg["STREET1"].value = src.STREET1 ?? "";
                            trg["STREET2"].value = src.STREET2 ?? "";
                            trg["STREET3"].value = src.STREET3 ?? "";
                            trg["STREET4"].value = src.STREET4 ?? "";
                            trg["COUNTRY"].value = src.COUNTRY ?? "";
                            trg["STATE"].value = src.STATE ?? "";
                            trg["CITY"].value = src.CITY ?? "";
                            trg["POSTAL_CODE"].value = src.POSTAL_CODE ?? "";
                            trg["EMAIL"].value = src.EMAIL ?? "";
                            trg["CONTACT_NO"].value = src.CONTACT_NO ?? "";
                        }



                        /* primary contact ------------------------------------------*/
                        const pCon = sInfo["Primary Contact"];
                        if (pCon) {
                            const c = r.TO_CONTACTS?.results?.[0] || {};
                            pCon["FIRST_NAME"].value = `${c.FIRST_NAME || ""} ${c.LAST_NAME || ""}`.trim();
                            pCon["CITY"].value = c.CITY || "";
                            pCon["STATE"].value = c.STATE || "";
                            pCon["COUNTRY"].value = c.COUNTRY || "";
                            pCon["POSTAL_CODE"].value = c.POSTAL_CODE || "";
                            pCon["DESIGNATION"].value = c.DESIGNATION || "";
                            pCon["EMAIL"].value = c.EMAIL || "";
                            pCon["CONTACT_NUMBER"].value = c.CONTACT_NO || "";
                            pCon["MOBILE"].value = c.MOBILE_NO || "";
                        }
                    }


                    /* === Finance Information ================================= */
                    const fin = model["Finance Information"];
                    if (fin) {
                        const bankRows = fin["Primary Bank details"] || [];      // form model
                        const bankResults = r.TO_BANKS?.results || [];              // backend data

                        /* ---- PRIMARY bank row (index 0) – your existing copy-code ---- */
                        if (bankRows[0] && bankResults[0]) {
                            const src = bankResults[0];
                            const trg = bankRows[0];

                            trg.BANK_TYPE = "Primary";
                            trg["SWIFT_CODE"].value = src.SWIFT_CODE ?? "";
                            trg["BRANCH_NAME"].value = src.BRANCH_NAME ?? "";
                            trg["BANK_COUNTRY"].value = src.BANK_COUNTRY ?? "";
                            trg["BANK_NAME"].value = src.BANK_NAME ?? "";
                            trg["BENEFICIARY"].value = src.BENEFICIARY ?? "";
                            trg["ACCOUNT_NO"].value = src.ACCOUNT_NO ?? "";
                            trg["IBAN_NUMBER"].value = src.IBAN_NUMBER ?? "";
                            trg["ROUTING_CODE"].value = src.ROUTING_CODE ?? "";
                            trg["BANK_CURRENCY"].value = src.BANK_CURRENCY ?? "";
                            fin["TAX-VAT-GST"].GST_NO.value = src.GST ?? "";
                        }

                        /* ---- OPTIONAL “Other Bank Details” row (index 1) ------------- */
                        if (bankResults[1]) {

                            /* 1️⃣  create a second row if missing, cloning the field structure */
                            if (!bankRows[1]) {
                                const copy = JSON.parse(JSON.stringify(bankRows[0]));   // deep clone
                                Object.keys(copy).forEach(k => {                        // blank the values
                                    if (k !== "BANK_TYPE") copy[k].value = "";
                                });
                                copy.BANK_TYPE = "Other Bank Details";
                                bankRows.push(copy);                                    // → array now has 2 rows
                            }

                            /* 2️⃣  fill it with backend values */
                            const src = bankResults[1];
                            const trg = bankRows[1];

                            trg["SWIFT_CODE"].value = src.SWIFT_CODE ?? "";
                            trg["BRANCH_NAME"].value = src.BRANCH_NAME ?? "";
                            trg["BANK_COUNTRY"].value = src.BANK_COUNTRY ?? "";
                            trg["BANK_NAME"].value = src.BANK_NAME ?? "";
                            trg["BENEFICIARY"].value = src.BENEFICIARY ?? "";
                            trg["ACCOUNT_NO"].value = src.ACCOUNT_NO ?? "";
                            trg["IBAN_NUMBER"].value = src.IBAN_NUMBER ?? "";
                            trg["ROUTING_CODE"].value = src.ROUTING_CODE ?? "";
                            trg["BANK_CURRENCY"].value = src.BANK_CURRENCY ?? "";
                        }
                    }


                    /* === Operational Information =============================== */
                    const op = model["Operational Information"];
                    if (op) {
                        const prod = op["Product-Service Description"];
                        if (prod) {
                            const p = r.TO_REG_PRODUCT_SERVICE?.results?.[0] || {};
                            prod["PRODUCT_NAME"].value = p.PROD_NAME || "";
                            prod["PRODUCT_DESCRIPTION"].value = p.PROD_DESCRIPTION || "";
                            prod["PRODUCT_TYPE"].value = p.PROD_TYPE || "";
                            prod["PRODUCT_CATEGORY"].value = p.PROD_CATEGORY || "";
                        }
                        const cap = op["Operational Capacity"];
                        if (cap) {
                            const c = r.TO_REG_CAPACITY?.results?.[0] || {};
                            cap["ORDER_SIZE_MIN"].value = c.MINIMUM_ORDER_SIZE || "";
                            cap["PRODUCTION_CAPACITY"].value = c.TOTAL_PROD_CAPACITY || "";
                            cap["PRODUCTION_LOCATION"].value = c.CITY || "";
                            cap["ORDER_SIZE_MAX"].value = c.MAXMIMUM_ORDER_SIZE || "";
                        }
                    }

                    var oDisclosureModelData = new JSONModel({});
                    const disclosure = model["Disclosures"];
                    const disclosureKeys = Object.keys(disclosure);
                    const fieldMapping = {
                        "Conflict of Interest": "INTEREST_CONFLICT",
                        "Legal Case Disclosure": "ANY_LEGAL_CASES",
                        "Anti-Corruption Regulation": "ABAC_REG",
                        "Export Control": "CONTROL_REGULATION"
                    };

                    const valueMapping = {
                        "YES": 0,
                        "NO": 1,
                        "NA": 2
                    };

                    disclosureKeys.forEach(function (fieldKey) {
                        const field = disclosure[fieldKey]; // field is the object like {label, mandatory, visible, ...}

                        // Check if the field object has the expected properties
                        if (field && fieldKey) {
                            // Generate the property name based on the fieldKey (label directly)
                            let propertyName = "/" + fieldKey.toLowerCase().replace(/ /g, '').replace('&', '').replace('-', '');

                            // Get the corresponding field name from the mapping
                            const mappedField = fieldMapping[fieldKey];

                            // Update disclosure model based on the response data
                            if (r && r.TO_DISCLOSURE_FIELDS && r.TO_DISCLOSURE_FIELDS.results.length > 0) {
                                const disclosureData = r.TO_DISCLOSURE_FIELDS.results[0]; // Get the first entry from the results array

                                // Get the value for the field using the mapped field name
                                let fieldValue = disclosureData[mappedField] || "NA"; // Default to "NA" if not available

                                // Map "YES" to 0, "NO" to 1, "NA" to 2
                                fieldValue = valueMapping[fieldValue]; // If value is not found in valueMapping, default to 2 (NA)

                                // Set the property in the model
                                oDisclosureModelData.setProperty(`/${propertyName}`, fieldValue);

                                // Debugging: Log the field change
                                console.log(`Set disclosure field ${fieldKey} (mapped to ${mappedField}):`, propertyName, "with value:", fieldValue);
                            } else {
                                console.error(`Disclosure data for ${mappedField} not found in response.`);
                            }

                        } else {
                            console.error(`Missing or invalid data for field: ${fieldKey}. Full field data:`, field);
                        }
                    });

                    this.getView().setModel(oDisclosureModelData, "existModel");

                    if (model["Quality Certificates"]) {
                        if (model["Quality Certificates"]["Standard Certifications"]) {
                            // Ensure that results from r.TO_QA_CERTIFICATES are available
                            if (r && r.TO_QA_CERTIFICATES && r.TO_QA_CERTIFICATES.results && r.TO_QA_CERTIFICATES.results.length > 0) {
                                // Iterate through the results array and set values
                                r.TO_QA_CERTIFICATES.results.forEach(cert => {
                                    // Check if the certificate name exists in the model

                                    const certName = `${cert.CERTI_NAME.replace(/ /g, '_')}_DONE_BY`;
                                    // const formattedCertName = certName.replace(/ _DONE_BY$/, ''); // Remove " - Done By" if it exists
                                    if (model["Quality Certificates"]["Standard Certifications"][certName]) {
                                        // Set the values for DONE_BY and AVAILABLE
                                        model["Quality Certificates"]["Standard Certifications"][certName].value = cert.DONE_BY || "N/A"; // Set DONE_BY, default to "N/A" if not found
                                        model["Quality Certificates"]["Standard Certifications"][certName].isCertified = cert.AVAILABLE === "YES" ? "Yes" : "No"; // Set isCertified based on AVAILABLE
                                        console.log(`Updated certification: ${certName}, DONE_BY: ${cert.DONE_BY}, AVAILABLE: ${cert.AVAILABLE}`);
                                    } else {
                                        console.warn(`No matching certification found in model for: ${cert.CERTI_NAME}`);
                                    }
                                });
                            } else {
                                console.error("No QA certificates found in response.");
                            }
                        }
                    }

                    if (model["Attachments"]) {
                        if (r && r.TO_ATTACHMENTS && r.TO_ATTACHMENTS.results && r.TO_ATTACHMENTS.results.length > 0) {
                            // Iterate through the response attachments and update model
                            r.TO_ATTACHMENTS.results.forEach((attachment, index) => {
                                // Find matching attachment in model based on fieldPath
                                const attachmentData = model["Attachments"][index];

                                if (attachmentData) {
                                    // Match the data from r.TO_ATTACHMENTS to the model
                                    attachmentData.fileName = attachment.IMAGE_FILE_NAME || ""; // Set the file name
                                    attachmentData.imageUrl = attachment.IMAGEURL || ""; // Set the image URL
                                    attachmentData.title = attachment.ATTACH_SHORT_DEC; // If imageUrl exists, mark as uploaded
                                    attachmentData.description = attachment.DESCRIPTION
                                    attachmentData.uploaded = true
                                }

                            });

                            // Update the model with the new values for Attachments
                            this.getView().getModel("formDataModel").setProperty("/Attachments", model["Attachments"]);

                        } else {
                            console.error("No attachments found in response.");
                        }
                    }



                    /* === Submission ============================================ */
                    const sub = model["Submission"]?.["Declaration"];
                    if (sub) {
                        sub["COMPLETED_BY"].value = r.COMPLETED_BY || "";
                        sub["DESIGNATION"].value = r.DESIGNATION || "";
                        sub["SUBMISSION_DATE"].value = r.SUBMISSION_DATE || "";
                        sub["ACK_VALIDATION"].value = true;
                    }
                } else {
                    if (model["Supplier Information"]) {
                        if (model["Supplier Information"]["Supplier Information"]) {
                            model["Supplier Information"]["Supplier Information"]["VENDOR_NAME1"].value = "Tech Innovations Ltd.";
                            model["Supplier Information"]["Supplier Information"]["WEBSITE"].value = "https://techinnovations.com";
                            model["Supplier Information"]["Supplier Information"]["REGISTERED_ID"].value = this._EMAIL;
                        }
                        if (model["Supplier Information"]["Address"]) {
                            model["Supplier Information"]["Address"][0]["HOUSE_NUM1"].value = "123 Tech Street";
                            model["Supplier Information"]["Address"][0]["STREET1"].value = "Building A";
                            model["Supplier Information"]["Address"][0]["STREET2"].value = "Tech Park";
                            model["Supplier Information"]["Address"][0]["STREET3"].value = "Pune";
                            model["Supplier Information"]["Address"][0]["STREET4"].value = "Pune";
                            model["Supplier Information"]["Address"][0]["COUNTRY"].value = "India";
                            model["Supplier Information"]["Address"][0]["STATE"].value = "Maharashtra";
                            model["Supplier Information"]["Address"][0]["CITY"].value = "Pune";
                            model["Supplier Information"]["Address"][0]["POSTAL_CODE"].value = "411001";
                            model["Supplier Information"]["Address"][0]["EMAIL"].value = "pune@techinnovations.com";
                            model["Supplier Information"]["Address"][0]["CONTACT_NO"].value = "9123456789";
                        }
                        if (model["Supplier Information"]["Primary Contact"]) {
                            model["Supplier Information"]["Primary Contact"]["FIRST_NAME"].value = "Amit Sharma";
                            model["Supplier Information"]["Primary Contact"]["CITY"].value = "Pune";
                            model["Supplier Information"]["Primary Contact"]["STATE"].value = "Maharashtra";
                            model["Supplier Information"]["Primary Contact"]["COUNTRY"].value = "India";
                            model["Supplier Information"]["Primary Contact"]["POSTAL_CODE"].value = "411001";
                            model["Supplier Information"]["Primary Contact"]["DESIGNATION"].value = "Procurement Manager";
                            model["Supplier Information"]["Primary Contact"]["EMAIL"].value = "amit.sharma@techinnovations.com";
                            model["Supplier Information"]["Primary Contact"]["CONTACT_NUMBER"].value = "+919876543210";
                            model["Supplier Information"]["Primary Contact"]["MOBILE"].value = "+919123456789";
                        }
                    }

                    // Prefill Finance Information
                    if (model["Finance Information"]) {
                        if (model["Finance Information"]["Primary Bank details"]) {
                            model["Finance Information"]["Primary Bank details"][0]["SWIFT_CODE"].value = "SBIN0001234";
                            model["Finance Information"]["Primary Bank details"][0]["BRANCH_NAME"].value = "Pune Main Branch";
                            // model["Finance Information"]["Primary Bank details"][0]["IFSC"].value = "SBIN0001234";
                            model["Finance Information"]["Primary Bank details"][0]["BANK_COUNTRY"].value = "India";
                            model["Finance Information"]["Primary Bank details"][0]["BANK_NAME"].value = "State Bank of India";
                            model["Finance Information"]["Primary Bank details"][0]["BENEFICIARY"].value = "Tech Innovations Ltd.";
                            model["Finance Information"]["Primary Bank details"][0]["ACCOUNT_NO"].value = "123456789012";
                            model["Finance Information"]["Primary Bank details"][0]["BENEFICIARY"].value = "Tech Innovations";
                            model["Finance Information"]["Primary Bank details"][0]["IBAN_NUMBER"].value = "IN12SBIN123456789012";
                            model["Finance Information"]["Primary Bank details"][0]["ROUTING_CODE"].value = "SBIN123";
                            // model["Finance Information"]["Primary Bank details"][0]["OTHER_CODE_NAME"].value = "IFSC";
                            // model["Finance Information"]["Primary Bank details"][0]["OTHER_CODE_VAL"].value = "SBIN0001234";
                            model["Finance Information"]["Primary Bank details"][0]["BANK_CURRENCY"].value = "INR";
                            model["Finance Information"]["TAX-VAT-GST"].GST_NO.value = "27AAACT1234P1ZP";
                        }

                    }

                    // Prefill Operational Information
                    if (model["Operational Information"]) {
                        if (model["Operational Information"]["Product-Service Description"]) {
                            model["Operational Information"]["Product-Service Description"]["PRODUCT_NAME"].value = "Industrial Widgets";
                            model["Operational Information"]["Product-Service Description"]["PRODUCT_DESCRIPTION"].value = "High-quality industrial widgets for manufacturing";
                            model["Operational Information"]["Product-Service Description"]["PRODUCT_TYPE"].value = "Finished Goods";
                            model["Operational Information"]["Product-Service Description"]["PRODUCT_CATEGORY"].value = "Mechanical Parts";
                        }
                        if (model["Operational Information"]["Operational Capacity"]) {
                            model["Operational Information"]["Operational Capacity"]["ORDER_SIZE_MIN"].value = "500 Units";
                            model["Operational Information"]["Operational Capacity"]["PRODUCTION_CAPACITY"].value = "10000 Units/Year";
                            model["Operational Information"]["Operational Capacity"]["PRODUCTION_LOCATION"].value = "Pune Factory";
                            model["Operational Information"]["Operational Capacity"]["ORDER_SIZE_MAX"].value = "5000 Units";
                        }
                    }

                    // Prefill Quality Certificates
                    if (model["Quality Certificates"]) {
                        if (model["Quality Certificates"]["Standard Certifications"]) {
                            Object.keys(model["Quality Certificates"]["Standard Certifications"]).forEach(key => {
                                model["Quality Certificates"]["Standard Certifications"][key].value = "Amit Sharma";
                                model["Quality Certificates"]["Standard Certifications"][key].isCertified = "Yes";
                            });
                        }
                    }

                    // Prefill Submission
                    if (model["Submission"]) {
                        if (model["Submission"]["Declaration"]) {
                            model["Submission"]["Declaration"]["COMPLETED_BY"].value = "Amit Sharma";
                            model["Submission"]["Declaration"]["DESIGNATION"].value = "Procurement Manager";
                            model["Submission"]["Declaration"]["SUBMISSION_DATE"].value = "29-04-2025";
                            model["Submission"]["Declaration"]["ACK_VALIDATION"].value = true;
                        }
                    }

                }

                return model;
            },

            createDynamicForm: function (data) {
                console.log("Creating dynamic form with data:", data);
                this.createSupplierFormPage(data["Supplier Information"]);
                this.createFinanceFormPage(data["Finance Information"]);
                this.createOperationalFormPage(data["Operational Information"]);
                this.createDisclosureForm(data["Disclosures"]);
                this.createQualityCertificatesForm(data["Quality Certificates"]);
                this.createAttachmentsForm(data["Attachments"]);
                this.createSubmission(data.Submission)
            },

            createSupplierFormPage: function (supplierData) {
                var oContainer = this.getView().byId("SupplierInformationFormContainer");
                if (!oContainer) {
                    console.error("SupplierInformationFormContainer not found");
                    MessageBox.error("Form container not found.");
                    return;
                }
                oContainer.removeAllContent();
                console.log("Container cleared:", oContainer);

                var sections = {
                    "Supplier Information": supplierData["Supplier Information"],
                    "Address": supplierData["Address"],
                    "Primary Contact": supplierData["Primary Contact"]
                };

                Object.keys(sections).forEach(function (sectionName) {
                    var sectionData = sections[sectionName];
                    if (!sectionData) {
                        console.warn(`No data for section: ${sectionName}`);
                        return;
                    }
                    console.log(`Processing section: ${sectionName}`, sectionData);

                    if (sectionName === "Address") {
                        sectionData.forEach(function (address, index) {
                            var addressType = address.ADDRESS_TYPE;
                            var oForm = new SimpleForm({
                                editable: true,
                                layout: "ColumnLayout",
                                title: addressType + " Address",
                                labelSpanL: 4,
                                labelSpanM: 4,
                                labelSpanS: 12,
                                emptySpanL: 1,
                                emptySpanM: 1,
                                emptySpanS: 0,
                                columnsL: 2,
                                columnsM: 2
                            });

                            if (addressType === "Primary" && !sectionData.some(addr => addr.ADDRESS_TYPE === "Other Office Address")) {
                                var oToolbar = new Toolbar({
                                    content: [
                                        new Title({ text: "Address" }),
                                        new ToolbarSpacer(),
                                        new Button({
                                            text: "Add Other Office Address",
                                            press: this.onAddOtherOfficeAddress.bind(this)
                                        })
                                    ]
                                });
                                oForm.setToolbar(oToolbar);
                                console.log("Added toolbar with title 'Address' and button to Primary Address header");
                            }

                            Object.keys(address).forEach(function (fieldKey) {
                                if (fieldKey === "ADDRESS_TYPE") return;
                                var field = address[fieldKey];
                                if (field.visible) {
                                    var oLabel = new Label({ text: field.label, required: field.mandatory });
                                    var oInput = new Input({
                                        value: field.value,
                                        required: field.mandatory,
                                        visible: field.visible,
                                        valueStateText: field.mandatory ? `${field.label} is required` : ""
                                    }).bindValue({
                                        path: `formDataModel>/Supplier Information/Address/${index}/${fieldKey}/value`
                                    });
                                    oForm.addContent(oLabel);
                                    oForm.addContent(oInput);
                                    console.log(`Added field: ${field.label} in ${addressType}`);
                                }
                            });

                            oContainer.addContent(oForm);
                            console.log(`Added form for ${addressType} Address`);
                        }.bind(this));
                    } else {
                        var oForm = new SimpleForm({
                            editable: true,
                            layout: "ColumnLayout",
                            title: sectionName,
                            labelSpanL: 4,
                            labelSpanM: 4,
                            labelSpanS: 12,
                            emptySpanL: 1,
                            emptySpanM: 1,
                            emptySpanS: 0,
                            columnsL: 2,
                            columnsM: 2
                        });

                        Object.keys(sectionData).forEach(function (fieldKey) {
                            var field = sectionData[fieldKey];
                            if (field.visible) {
                                var oLabel = new Label({ text: field.label, required: field.mandatory });
                                var oInput = new Input({
                                    value: field.value,
                                    required: field.mandatory,
                                    visible: field.visible,
                                    valueStateText: field.mandatory ? `${field.label} is required` : ""
                                }).bindValue({
                                    path: `formDataModel>/Supplier Information/${sectionName}/${fieldKey}/value`
                                });
                                oForm.addContent(oLabel);
                                oForm.addContent(oInput);
                                console.log(`Added field: ${field.label} in ${sectionName}`);
                            }
                        });

                        oContainer.addContent(oForm);
                        console.log(`Added form for section: ${sectionName}`);
                    }
                }.bind(this));
            },

            createFinanceFormPage: function (financeData) {
                var oContainer = this.getView().byId("FinanceInformationFormContainer");
                if (!oContainer) {
                    console.error("FinanceInformationFormContainer not found");
                    MessageBox.error("Finance container not found.");
                    return;
                }
                oContainer.removeAllContent();
                console.log("Container cleared:", oContainer);

                var categories = {
                    "Primary Bank details": financeData["Primary Bank details"]
                };

                Object.keys(categories).forEach(function (categoryName) {
                    var categoryData = categories[categoryName];
                    if (!categoryData) {
                        console.warn(`No data for category: ${categoryName}`);
                        return;
                    }
                    console.log(`Processing category: ${categoryName}`, categoryData);

                    categoryData.forEach(function (bank, index) {
                        var bankType = bank.BANK_TYPE;
                        var oForm = new SimpleForm({
                            editable: true,
                            layout: "ColumnLayout",
                            title: bankType + " Bank Details",
                            labelSpanL: 4,
                            labelSpanM: 4,
                            labelSpanS: 12,
                            emptySpanL: 1,
                            emptySpanM: 1,
                            emptySpanS: 0,
                            columnsL: 2,
                            columnsM: 2
                        });

                        if (bankType === "Primary" && !categoryData.some(b => b.BANK_TYPE === "Other Bank Details")) {
                            var oToolbar = new Toolbar({
                                content: [
                                    new Title({ text: "Bank Details" }),
                                    new ToolbarSpacer(),
                                    new Button({
                                        text: "Add More Bank Details",
                                        press: this.onAddOtherBankDetails.bind(this)
                                    })
                                ]
                            });
                            oForm.setToolbar(oToolbar);
                            console.log("Added toolbar with title 'Bank Details' and button to Primary Bank Details header");
                        }

                        Object.keys(bank).forEach(function (fieldKey) {
                            if (fieldKey === "BANK_TYPE") return;
                            var field = bank[fieldKey];
                            console.log(`Processing field: ${fieldKey} in ${bankType}`, field);

                            if (field.visible) {
                                var oLabel = new Label({ text: field.label, required: field.mandatory });

                                var oControl;
                                if (fieldKey === "BANK_COUNTRY" || fieldKey === "BANK_CURRENCY") {
                                    oControl = new ComboBox({
                                        required: field.mandatory,
                                        visible: field.visible,
                                        value: field.value,
                                        items: [
                                            new sap.ui.core.ListItem({ text: "India", key: "IN" }),
                                            new sap.ui.core.ListItem({ text: "USA", key: "US" }),
                                            new sap.ui.core.ListItem({ text: "UK", key: "GB" })
                                        ].concat(fieldKey === "BANK_CURRENCY" ? [
                                            new sap.ui.core.ListItem({ text: "INR", key: "INR" }),
                                            new sap.ui.core.ListItem({ text: "USD", key: "USD" }),
                                            new sap.ui.core.ListItem({ text: "GBP", key: "GBP" })
                                        ] : [])
                                    }).bindValue({
                                        path: `formDataModel>/Finance Information/Primary Bank details/${index}/${fieldKey}/value`
                                    });
                                } else {
                                    oControl = new Input({
                                        value: field.value,
                                        required: field.mandatory,
                                        visible: field.visible,
                                        valueStateText: field.mandatory ? `${field.label} is required` : ""
                                    }).bindValue({
                                        path: `formDataModel>/Finance Information/Primary Bank details/${index}/${fieldKey}/value`
                                    });
                                }

                                oForm.addContent(oLabel);
                                oForm.addContent(oControl);
                                console.log(`Added field: ${field.label} in ${bankType}`);
                            }
                        });

                        oContainer.addContent(oForm);
                        console.log(`Added form for ${bankType} Bank Details`);
                    }.bind(this));
                }.bind(this));

                var taxData = financeData["TAX-VAT-GST"];
                if (taxData) {
                    var oTaxForm = new SimpleForm({
                        editable: true,
                        layout: "ColumnLayout",
                        title: "TAX/VAT/GST",
                        labelSpanL: 4,
                        labelSpanM: 4,
                        labelSpanS: 12,
                        emptySpanL: 1,
                        emptySpanM: 1,
                        emptySpanS: 0,
                        columnsL: 2,
                        columnsM: 2
                    });

                    Object.keys(taxData).forEach(function (fieldKey) {
                        var field = taxData[fieldKey];
                        if (field.visible) {
                            var oLabel = new Label({ text: field.label, required: field.mandatory });

                            var oControl;
                            if (fieldKey === "TAX/VAT/GST") {
                                oControl = new RadioButtonGroup({
                                    columns: 2,
                                    buttons: [
                                        new RadioButton({ text: "Yes" }),
                                        new RadioButton({ text: "No" })
                                    ]
                                }).bindProperty("selectedIndex", {
                                    path: `formDataModel>/Finance Information/TAX-VAT-GST/${fieldKey}/value`,
                                    formatter: function (value) {
                                        return value === "Yes" ? 0 : 1;
                                    },
                                    formatTarget: function (selectedIndex) {
                                        return selectedIndex === 0 ? "Yes" : "No";
                                    }
                                });
                            } else {
                                oControl = new Input({
                                    value: field.value,
                                    required: field.mandatory,
                                    visible: field.visible,
                                    valueStateText: field.mandatory ? `${field.label} is required` : ""
                                }).bindValue({
                                    path: `formDataModel>/Finance Information/TAX-VAT-GST/${fieldKey}/value`
                                });
                            }

                            oTaxForm.addContent(oLabel);
                            oTaxForm.addContent(oControl);
                            console.log(`Added field: ${field.label} in TAX-VAT-GST`);
                        }
                    });

                    oContainer.addContent(oTaxForm);
                    console.log("Added form for TAX-VAT-GST");
                }
            },

            createOperationalFormPage: function (operationalData) {
                var oContainer = this.getView().byId("OperationalInformationFormContainer");
                if (!oContainer) {
                    console.error("OperationalInformationFormContainer not found");
                    MessageBox.error("Operational container not found.");
                    return;
                }
                oContainer.removeAllContent();
                console.log("Container cleared:", oContainer);

                var categories = {
                    "Product-Service Description": operationalData['Product-Service Description'],
                    "Operational Capacity": operationalData["Operational Capacity"]
                };

                Object.keys(categories).forEach(function (categoryName) {
                    var categoryData = categories[categoryName];
                    if (!categoryData) {
                        console.warn(`No data for category: ${categoryName}`);
                        return;
                    }
                    console.log(`Processing category: ${categoryName}`, categoryData);

                    var oForm = new SimpleForm({
                        editable: true,
                        layout: "ColumnLayout",
                        title: categoryName,
                        labelSpanL: 4,
                        labelSpanM: 4,
                        labelSpanS: 12,
                        emptySpanL: 1,
                        emptySpanM: 1,
                        emptySpanS: 0,
                        columnsL: 2,
                        columnsM: 2
                    });

                    Object.keys(categoryData).forEach(function (fieldKey) {
                        var field = categoryData[fieldKey];
                        if (field.visible) {
                            var oLabel = new Label({ text: field.label, required: field.mandatory });

                            var oControl;
                            if (fieldKey === "PRODUCT_CATEGORY") {
                                oControl = new ComboBox({
                                    required: field.mandatory,
                                    visible: field.visible,
                                    value: field.value,
                                    items: [
                                        new sap.ui.core.ListItem({ text: "Electrical Equipment", key: "EE" }),
                                        new sap.ui.core.ListItem({ text: "Mechanical Parts", key: "MP" }),
                                        new sap.ui.core.ListItem({ text: "Raw Materials", key: "RM" })
                                    ]
                                }).bindValue({
                                    path: `formDataModel>/Operational Information/${categoryName}/${fieldKey}/value`
                                });
                            } else {
                                oControl = new Input({
                                    value: field.value,
                                    required: field.mandatory,
                                    visible: field.visible,
                                    valueStateText: field.mandatory ? `${field.label} is required` : ""
                                }).bindValue({
                                    path: `formDataModel>/Operational Information/${categoryName}/${fieldKey}/value`
                                });
                            }

                            oForm.addContent(oLabel);
                            oForm.addContent(oControl);
                            console.log(`Added field: ${field.label} in ${categoryName}`);
                        }
                    });

                    oContainer.addContent(oForm);
                    console.log(`Added form for ${categoryName}`);
                });
            },

            createDisclosureForm: function (oDisclosureFields, type) {
                let that = this;
                if (!oDisclosureFields || typeof oDisclosureFields !== "object" || Object.keys(oDisclosureFields).length === 0) {
                    console.error("No fields found for Disclosure or invalid object. Check oDisclosureFields:", oDisclosureFields);
                    return;
                }

                var oContainer = this.getView().byId(this.getView().createId("DisclosureFormContainer"));
                if (!oContainer) {
                    console.error("DisclosureFormContainer not found. Check your view XML.");
                    return;
                }

                // Main VBox for the entire form
                var oMainVBox = new sap.m.VBox({
                    width: "100%"
                }).addStyleClass("disclosureContainer");

                // Get existing model data (existModel) to copy the values
                var existModel = this.getView().getModel("existModel");
                var existModelData = existModel ? existModel.getData() : {};

                // Mapping between label names and actual property names in existModel
                var fieldMapping = {
                    "Conflict of Interest": "conflictofinterest",
                    "Legal Case Disclosure": "legalcasedisclosure",
                    "Anti-Corruption & Anti Bribery Regulation": "anticorruptionregulation",
                    "Indian Export Control": "exportcontrol"
                };

                // Initialize disclosure model with default values (1)
                var oModel = new sap.ui.model.json.JSONModel({});
                var propertyMap = {}; // Track property names for debugging

                Object.keys(oDisclosureFields).forEach(function (category) {
                    var categoryData = oDisclosureFields[category];
                    Object.keys(categoryData).forEach(function (fieldKey) {
                        var field = categoryData[fieldKey];
                        if (field.visible) {
                            var propertyName = "/" + field.label.toLowerCase().replace(/ /g, '').replace('&', '').replace('-', ''); // Default to NA (1)

                            // Get the corresponding property name from the mapping
                            var mappedProperty = fieldMapping[field.label];

                            // Retrieve existing data from existModel, defaulting to 1 if not present
                            var existingValue = existModelData[mappedProperty];
                            var valueToSet = (existingValue !== undefined) ? existingValue : 1;

                            // Set the value in the disclosure model
                            oModel.setProperty(propertyName, valueToSet);
                            propertyMap[field.label] = propertyName; // Map label to propertyName

                            console.log("Initialized property:", propertyName, "for label:", field.label, "with value:", valueToSet); // Debug initialization
                        }
                    });
                });

                // Set the model to the view
                this.getView().setModel(oModel, "disclosureModel");

                // Iterate over categories and create fields
                Object.keys(oDisclosureFields).forEach(function (category) {
                    var categoryData = oDisclosureFields[category];
                    Object.keys(categoryData).forEach(function (fieldKey) {
                        var field = categoryData[fieldKey];
                        if (field.visible) {
                            var oFieldVBox = new sap.m.VBox({
                                fitContainer: true
                            }).addStyleClass("sapUiMediumMarginBottom");

                            // Label
                            var oLabel = new sap.m.Label({
                                text: field.label,
                                required: field.mandatory,
                                wrapping: true
                            });

                            // Description
                            var oDescription = new sap.m.Text({
                                text: field.description || "No description available.",
                                wrapping: true
                            }).addStyleClass("sapUiSmallMarginBottom");

                            // Radio Button Group
                            var oRadioButtonGroup = new sap.m.RadioButtonGroup({
                                columns: 3,
                                selectedIndex: {
                                    path: "disclosureModel>" + propertyMap[field.label],
                                    formatter: function (value) {
                                        var index = parseInt(value, 10);
                                        console.log("Formatter for", field.label, "value:", value, "parsed index:", index); // Debug formatter
                                        return isNaN(index) ? 2 : index; // Default to 2 (NA) if invalid
                                    }
                                },
                                select: function (oEvent) {
                                    var oDisclosureModel = that.getView().getModel("disclosureModel");
                                    if (oDisclosureModel) {
                                        var selectedIndex = oEvent.getParameter("selectedIndex");
                                        oDisclosureModel.setProperty(propertyMap[field.label], selectedIndex);
                                        console.log("Radio button changed for", field.label, "property:", propertyMap[field.label], "new value:", selectedIndex); // Debug change
                                    } else {
                                        console.error("disclosureModel not available during select event.");
                                    }
                                }.bind(this)
                            });

                            oRadioButtonGroup.addButton(new sap.m.RadioButton({ text: "Yes" }));
                            oRadioButtonGroup.addButton(new sap.m.RadioButton({ text: "No" }));
                            oRadioButtonGroup.addButton(new sap.m.RadioButton({ text: "NA" }));

                            // Add items to field VBox
                            oFieldVBox.addItem(oLabel);
                            oFieldVBox.addItem(oDescription);
                            oFieldVBox.addItem(oRadioButtonGroup);

                            oMainVBox.addItem(oFieldVBox);
                            console.log(`Added field: ${field.label} in Disclosure`);
                        }
                    });
                });

                // Clear and add content to container
                oContainer.removeAllContent();
                oContainer.addContent(oMainVBox);

                // Debugging: Log the VBox structure and initial model state
                console.log("VBox Content:", oMainVBox.getItems());
                console.log("Initial Disclosure Model:", oModel.getData());

            },


            createQualityCertificatesForm: function (qualityCertificatesData) {
                if (!qualityCertificatesData || typeof qualityCertificatesData !== "object" || Object.keys(qualityCertificatesData).length === 0) {
                    console.error("No fields found for Quality Certificates or invalid object. Check qualityCertificatesData:", qualityCertificatesData);
                    return;
                }

                var oContainer = this.getView().byId(this.getView().createId("QualityCertificatesFormContainer"));
                if (!oContainer) {
                    console.error("QualityCertificatesFormContainer not found. Check your view XML.");
                    return;
                }

                // Main Table for Quality Certificates
                var oTable = new Table({
                    width: "100%"
                }).addStyleClass("qualityCertificatesTable");

                // Add Columns
                oTable.addColumn(new Column({
                    header: new Label({ text: "Description" })
                }));
                oTable.addColumn(new Column({
                    header: new Label({ text: "Action" })
                }));
                oTable.addColumn(new Column({
                    header: new Label({ text: "Done By" })
                }));

                // Iterate over categories (e.g., "Standard Certifications")
                Object.keys(qualityCertificatesData).forEach(function (category) {
                    var categoryData = qualityCertificatesData[category];
                    Object.keys(categoryData).forEach(function (fieldKey) {
                        var field = categoryData[fieldKey];
                        if (field.visible) {
                            var descriptionText = field.label.replace(" - Done By", ""); // Extract certification name
                            var oRow = new sap.m.ColumnListItem();

                            // Description Cell
                            oRow.addCell(new Text({ text: descriptionText }));

                            // Action Cell (ComboBox)
                            var oComboBox = new ComboBox({
                                selectedKey: field.isCertified,
                                items: [
                                    new sap.ui.core.ListItem({ key: "Yes", text: "Yes" }),
                                    new sap.ui.core.ListItem({ key: "No", text: "No" })
                                ]
                            }).bindProperty("selectedKey", {
                                path: `formDataModel>/Quality Certificates/${category}/${fieldKey}/isCertified`
                            });
                            oRow.addCell(oComboBox);

                            // Done By Cell (Input)
                            var oInput = new Input({
                                value: field.value,
                                required: field.mandatory,
                                visible: field.visible,
                                valueStateText: field.mandatory ? `${field.label} is required` : "",
                                placeholder: "Enter name"
                            }).bindValue({
                                path: `formDataModel>/Quality Certificates/${category}/${fieldKey}/value`
                            });
                            oRow.addCell(oInput);

                            oTable.addItem(oRow);
                            console.log(`Added row for: ${field.label} in ${category}`);
                        }
                    });
                });

                // Clear and add content to container
                oContainer.removeAllContent();
                oContainer.addContent(oTable);

                // Debugging: Log the table structure
                console.log("Table Content:", oTable.getItems());
            },

            createAttachmentsForm: function (oAttachmentFields, bForceRecreate = false) {
                // Check if the attachment section has already been created
                if (this._bAttachmentSectionCreated && !bForceRecreate) {
                    console.log("Attachment section already created, skipping re-render");
                    return;
                }

                if (!oAttachmentFields || oAttachmentFields.length === 0) {
                    console.error("No fields found for Attachments");
                    return;
                }

                var oContainer = this.getView().byId("AttachmentsFormContainer");
                if (!oContainer) {
                    console.error("AttachmentsFormContainer not found. Check your view XML.");
                    return;
                }

                // Clear the container only if we are forcing a recreate
                if (bForceRecreate || !this._bAttachmentSectionCreated) {
                    oContainer.removeAllContent();
                }

                var oMainVBox = new sap.m.VBox().addStyleClass("subSectionSpacing");
                this._oMainVBox = oMainVBox;

                var oFormDataModel = this.getView().getModel("formDataModel");
                if (!oFormDataModel) {
                    console.error("formDataModel not found in the view. Ensure it is set in onInit.");
                    return;
                }

                // Log the initial oAttachmentFields
                console.log("Initial oAttachmentFields:", oAttachmentFields);

                // Transform oAttachmentFields to include title and empty description
                var transformedFields = oAttachmentFields.map(field => {
                    const updatedField = {
                        description: field.description || "",
                        title: field.title || "Untitled Section",
                        fileName: field.fileName || "",
                        uploaded: field.uploaded || false,
                        fieldPath: field.fieldPath || (field.title || "DEFAULT").toUpperCase().replace(/\s+/g, '_'),
                        fieldId: field.fieldId || "V1R1D" + Date.now(),
                        imageUrl: field.imageUrl || ""
                    };
                    console.log("Transformed field:", updatedField);
                    return updatedField;
                });

                // Set the transformed data into the model only if it hasn't been set yet
                if (!oFormDataModel.getProperty("/Attachments") || bForceRecreate) {
                    oFormDataModel.setProperty("/Attachments", transformedFields);
                    oFormDataModel.refresh(true);
                    console.log("Model after setting Attachments:", oFormDataModel.getProperty("/Attachments"));
                }

                this._attachmentFields = transformedFields;

                // Model for fragment dialog
                var oDialogModel = new sap.ui.model.json.JSONModel({
                    newDocumentName: "",
                    showError: false
                });
                this.getView().setModel(oDialogModel, "dialogModel");

                // Method to open the document name input dialog
                this.openDocumentDialog = function () {
                    sap.ui.getCore().loadLibrary("sap.m", { async: false });

                    // Check if dialog exists and is valid, otherwise create a new one
                    if (!this._oDialog || !(this._oDialog instanceof sap.m.Dialog) || this._oDialog.bIsDestroyed) {
                        try {
                            this._oDialog = sap.ui.xmlfragment(
                                "com.aispsuppform.aispsupplierform.fragments.AddDocumentDialog",
                                this
                            );
                            if (!(this._oDialog instanceof sap.m.Dialog)) {
                                console.error("Fragment did not return a Dialog object:", this._oDialog);
                                sap.m.MessageToast.show("Failed to load document dialog. Please check the fragment configuration.");
                                return;
                            }
                            this.getView().addDependent(this._oDialog);
                            this._oDialog.setModel(oDialogModel, "dialogModel");
                            console.log("Dialog created successfully:", this._oDialog);
                        } catch (e) {
                            console.error("Error loading fragment:", e);
                            sap.m.MessageToast.show("Error loading document dialog. Please contact support.");
                            return;
                        }
                    }

                    // Reset dialog model state
                    oDialogModel.setProperty("/newDocumentName", "");
                    oDialogModel.setProperty("/showError", false);

                    // Open the dialog
                    try {
                        this._oDialog.open();
                    } catch (e) {
                        console.error("Error opening dialog:", e);
                        sap.m.MessageToast.show("Error opening document dialog.");
                    }
                };

                // Handle dialog submit
                this.onSubmitDocumentName = function () {
                    var sNewTitle = oDialogModel.getProperty("/newDocumentName").trim();
                    if (!sNewTitle) {
                        sap.m.MessageToast.show("Please enter a document name");
                        return;
                    }

                    // Check for duplicate title
                    var bTitleExists = oFormDataModel.getProperty("/Attachments").some(field =>
                        field.title.toLowerCase() === sNewTitle.toLowerCase()
                    );
                    if (bTitleExists) {
                        oDialogModel.setProperty("/showError", true);
                        return;
                    }

                    // Close dialog
                    this._oDialog.close();

                    // Proceed with adding new document
                    var newAttachment = {
                        description: "",
                        title: sNewTitle,
                        fileName: "",
                        uploaded: false,
                        fieldPath: sNewTitle.toUpperCase().replace(/\s+/g, '_'),
                        fieldId: "V1R1D" + Date.now(),
                        imageUrl: ""
                    };

                    var oAttachments = oFormDataModel.getProperty("/Attachments");
                    oAttachments.push(newAttachment);
                    oFormDataModel.setProperty("/Attachments", oAttachments);
                    oFormDataModel.refresh(true);
                    console.log("Added new attachment:", newAttachment);

                    // Check if a VBox for this title already exists
                    var oExistingVBox = this._oMainVBox.getItems().find(item => {
                        return item instanceof sap.m.VBox &&
                            item.getItems()[0] instanceof sap.m.HBox &&
                            item.getItems()[0].getItems()[0] instanceof sap.m.Title &&
                            item.getItems()[0].getItems()[0].getText() === sNewTitle;
                    });

                    if (!oExistingVBox) {
                        var oNewTable = new sap.m.Table({
                            growing: true,
                            columns: [
                                new sap.m.Column({ header: new sap.m.Label({ text: "Description" }) }),
                                new sap.m.Column({ header: new sap.m.Label({ text: "Upload" }) }),
                                new sap.m.Column({ header: new sap.m.Label({ text: "File Name" }) }),
                                new sap.m.Column({ header: new sap.m.Label({ text: "Actions" }) })
                            ]
                        });

                        var oFileUploader = new sap.ui.unified.FileUploader({
                            name: "myFileUpload",
                            uploadUrl: "upload/",
                            tooltip: "Upload your file to the local server",
                            uploadComplete: this.handleUploadComplete.bind(this),
                            change: this.handleValueChange.bind(this),
                            typeMissmatch: this.handleTypeMissmatch.bind(this),
                            style: "Emphasized",
                            fileType: "txt,jpg,pdf,doc,docx,png",
                            placeholder: "Choose a file for Upload...",
                            visible: true
                        });

                        var oItemTemplate = new sap.m.ColumnListItem({
                            cells: [
                                new sap.m.Input({
                                    value: "{formDataModel>description}",
                                    change: this.onDescriptionChange.bind(this)
                                }),
                                new sap.m.Button({
                                    text: "Upload",
                                    press: function (oEvent) {
                                        var oButton = oEvent.getSource();
                                        var oContext = oButton.getBindingContext("formDataModel");
                                        if (oContext) {
                                            oButton.addDependent(oFileUploader);
                                            oFileUploader.setBindingContext(oContext, "formDataModel");
                                            oContainer.addContent(oFileUploader);
                                            setTimeout(() => {
                                                var $fileInput = oFileUploader.$().find("input[type='file']");
                                                if ($fileInput.length > 0) {
                                                    $fileInput.trigger("click");
                                                    if (!oFileUploader.getFocusDomRef()) {
                                                        console.warn("FileUploader focus issue detected after delay");
                                                    }
                                                } else {
                                                    console.error("File input not found in FileUploader");
                                                }
                                                oContainer.removeContent(oFileUploader);
                                            }, 100);
                                        } else {
                                            console.error("No binding context found for Upload button");
                                        }
                                    }
                                }),
                                new sap.m.Text({
                                    text: "{formDataModel>fileName}"
                                }),
                                new sap.m.HBox({
                                    visible: true,
                                    items: [
                                        new sap.m.Button({
                                            icon: "sap-icon://download",
                                            type: "Transparent",
                                            tooltip: "Download",
                                            press: function (oEvent) {
                                                var oContext = oEvent.getSource().getBindingContext("formDataModel");
                                                var sFileName = oContext.getProperty("fileName");
                                                var sImageUrl = oContext.getProperty("imageUrl");
                                                sap.m.MessageToast.show("Download functionality for " + sImageUrl + " to be implemented");
                                            }
                                        }),
                                        new sap.m.Button({
                                            icon: "sap-icon://delete",
                                            type: "Transparent",
                                            tooltip: "Remove",
                                            press: function (oEvent) {
                                                var oContext = oEvent.getSource().getBindingContext("formDataModel");
                                                var sPath = oContext.getPath();
                                                oFormDataModel.setProperty(sPath + "/fileName", "");
                                                oFormDataModel.setProperty(sPath + "/uploaded", false);
                                                oFormDataModel.setProperty(sPath + "/imageUrl", "");
                                            }
                                        })
                                    ]
                                })
                            ]
                        });

                        oNewTable.bindItems({
                            path: "formDataModel>/Attachments",
                            template: oItemTemplate,
                            filters: [
                                new sap.ui.model.Filter({
                                    path: "title",
                                    operator: sap.ui.model.FilterOperator.EQ,
                                    value1: sNewTitle
                                })
                            ]
                        });

                        // Create an HBox for the title and Remove button
                        var oHeaderHBox = new sap.m.HBox({
                            items: [
                                new sap.m.Title({
                                    text: sNewTitle,
                                    level: "H3"
                                }),
                                new sap.m.Button({
                                    icon: "sap-icon://decline",
                                    type: "Transparent",
                                    tooltip: "Remove Section",
                                    press: this.onRemoveDocumentSection.bind(this, sNewTitle)
                                })
                            ],
                            justifyContent: "SpaceBetween",
                            alignItems: "Center"
                        });

                        var oNewVBox = new sap.m.VBox({
                            items: [
                                oHeaderHBox,
                                oNewTable
                            ]
                        }).addStyleClass("attachmentTableSection");

                        this._oMainVBox.addItem(oNewVBox);
                        console.log(`Created new table for ${sNewTitle}`);

                        var oNewTableBinding = oNewTable.getBinding("items");
                        if (oNewTableBinding) {
                            oNewTableBinding.refresh();
                            console.log(`Refreshed binding for ${sNewTitle} table`);
                        } else {
                            console.warn(`Binding for ${sNewTitle} table not found, attempting delayed refresh`);
                            setTimeout(() => {
                                var delayedBinding = oNewTable.getBinding("items");
                                if (delayedBinding) {
                                    delayedBinding.refresh();
                                    console.log(`Delayed refresh successful for ${sNewTitle} table`);
                                } else {
                                    console.error(`Delayed binding for ${sNewTitle} table still not found`);
                                }
                            }, 100);
                        }
                    } else {
                        var oExistingTable = oExistingVBox.getItems()[1];
                        if (oExistingTable) {
                            var oExistingBinding = oExistingTable.getBinding("items");
                            if (oExistingBinding) {
                                oExistingBinding.refresh();
                                console.log(`Refreshed existing table for ${sNewTitle}`);
                            } else {
                                console.warn(`Binding for existing ${sNewTitle} table not found, attempting delayed refresh`);
                                setTimeout(() => {
                                    var delayedBinding = oExistingTable.getBinding("items");
                                    if (delayedBinding) {
                                        delayedBinding.refresh();
                                        console.log(`Delayed refresh successful for existing ${sNewTitle} table`);
                                    } else {
                                        console.error(`Delayed binding for existing ${sNewTitle} table still not found`);
                                    }
                                }, 100);
                            }
                        }
                    }
                };

                // Handle section removal
                this.onRemoveDocumentSection = function (sTitle) {
                    // Confirm deletion
                    sap.m.MessageBox.confirm(`Are you sure you want to remove the "${sTitle}" section?`, {
                        title: "Confirm Deletion",
                        onClose: function (oAction) {
                            if (oAction === sap.m.MessageBox.Action.OK) {
                                // Remove from model
                                var oAttachments = oFormDataModel.getProperty("/Attachments");
                                oAttachments = oAttachments.filter(field => field.title !== sTitle);
                                oFormDataModel.setProperty("/Attachments", oAttachments);
                                oFormDataModel.refresh(true);
                                console.log(`Removed attachments with title: ${sTitle}`);

                                // Remove the VBox from UI
                                var oVBoxToRemove = this._oMainVBox.getItems().find(item => {
                                    return item instanceof sap.m.VBox &&
                                        item.getItems()[0] instanceof sap.m.HBox &&
                                        item.getItems()[0].getItems()[0] instanceof sap.m.Title &&
                                        item.getItems()[0].getItems()[0].getText() === sTitle;
                                });
                                if (oVBoxToRemove) {
                                    this._oMainVBox.removeItem(oVBoxToRemove);
                                    oVBoxToRemove.destroy();
                                    console.log(`Removed VBox for ${sTitle} from UI`);
                                } else {
                                    console.warn(`VBox for ${sTitle} not found in UI`);
                                }

                                sap.m.MessageToast.show(`Section "${sTitle}" removed successfully`);
                            }
                        }.bind(this)
                    });
                };

                // Handle dialog cancel
                this.onCancelDocumentName = function () {
                    this._oDialog.destroy();
                };

                // Create the "Add Other Document" button in the header
                var oAddButton = new sap.m.Button({
                    text: "Add Other Document",
                    press: this.openDocumentDialog.bind(this)
                });

                // Create the header with the Add button
                var oHeader = new sap.m.HBox({
                    items: [
                        new sap.m.Title({ text: "Attachments", level: "H2" }),
                        oAddButton
                    ],
                    justifyContent: "SpaceBetween"
                });

                oMainVBox.addItem(oHeader);

                // Store tables for delayed refresh
                var aTables = [];

                if (bForceRecreate || !this._bAttachmentSectionCreated) {
                    transformedFields.forEach((oField, index) => {
                        var oTable = new sap.m.Table({
                            growing: true,
                            columns: [
                                new sap.m.Column({ header: new sap.m.Label({ text: "Description" }) }),
                                new sap.m.Column({ header: new sap.m.Label({ text: "Upload" }) }),
                                new sap.m.Column({ header: new sap.m.Label({ text: "File Name" }) }),
                                new sap.m.Column({ header: new sap.m.Label({ text: "Actions" }) })
                            ]
                        });

                        var oFileUploader = new sap.ui.unified.FileUploader({
                            name: "myFileUpload",
                            uploadUrl: "upload/",
                            tooltip: "Upload your file to the local server",
                            uploadComplete: this.handleUploadComplete.bind(this),
                            change: this.handleValueChange.bind(this),
                            typeMissmatch: this.handleTypeMissmatch.bind(this),
                            style: "Emphasized",
                            fileType: "txt,jpg,pdf,doc,docx,png",
                            placeholder: "Choose a file for Upload...",
                            visible: true
                        });

                        var oItemTemplate = new sap.m.ColumnListItem({
                            cells: [
                                new sap.m.Input({
                                    value: "{formDataModel>description}",
                                    change: this.onDescriptionChange.bind(this)
                                }),
                                new sap.m.Button({
                                    text: "Upload",
                                    press: function (oEvent) {
                                        var oButton = oEvent.getSource();
                                        var oContext = oButton.getBindingContext("formDataModel");
                                        if (oContext) {
                                            oButton.addDependent(oFileUploader);
                                            oFileUploader.setBindingContext(oContext, "formDataModel");
                                            oContainer.addContent(oFileUploader);
                                            setTimeout(() => {
                                                var $fileInput = oFileUploader.$().find("input[type='file']");
                                                if ($fileInput.length > 0) {
                                                    $fileInput.trigger("click");
                                                    if (!oFileUploader.getFocusDomRef()) {
                                                        console.warn("FileUploader focus issue detected after delay");
                                                    }
                                                } else {
                                                    console.error("File input not found in FileUploader");
                                                }
                                                oContainer.removeContent(oFileUploader);
                                            }, 100);
                                        } else {
                                            console.error("No binding context found for Upload button");
                                        }
                                    }
                                }),
                                new sap.m.Text({
                                    text: "{formDataModel>fileName}"
                                }),
                                new sap.m.HBox({
                                    visible: true,
                                    items: [
                                        new sap.m.Button({
                                            icon: "sap-icon://download",
                                            type: "Transparent",
                                            tooltip: "Download",
                                            press: function (oEvent) {
                                                var oContext = oEvent.getSource().getBindingContext("formDataModel");
                                                var sFileName = oContext.getProperty("fileName");
                                                sap.m.MessageToast.show("Download functionality for " + sFileName + " to be implemented");
                                            }
                                        }),
                                        new sap.m.Button({
                                            icon: "sap-icon://delete",
                                            type: "Transparent",
                                            tooltip: "Remove",
                                            press: function (oEvent) {
                                                var oContext = oEvent.getSource().getBindingContext("formDataModel");
                                                var sPath = oContext.getPath();
                                                oFormDataModel.setProperty(sPath + "/fileName", "");
                                                oFormDataModel.setProperty(sPath + "/uploaded", false);
                                                oFormDataModel.setProperty(sPath + "/imageUrl", "");
                                            }
                                        })
                                    ]
                                })
                            ]
                        });

                        console.log(`Binding table with title: ${oField.title}`);
                        console.log("Model data before binding:", oFormDataModel.getProperty("/Attachments"));

                        oTable.bindItems({
                            path: "formDataModel>/Attachments",
                            template: oItemTemplate,
                            filters: [
                                new sap.ui.model.Filter({
                                    path: "title",
                                    operator: sap.ui.model.FilterOperator.EQ,
                                    value1: oField.title
                                })
                            ]
                        });

                        aTables.push({ table: oTable, title: oField.title });

                        oMainVBox.addItem(new sap.m.VBox({
                            items: [
                                new sap.m.Title({
                                    text: oField.title,
                                    level: "H3"
                                }),
                                oTable
                            ]
                        }).addStyleClass("attachmentTableSection"));
                    });

                    // Perform delayed refresh for all initial tables
                    setTimeout(() => {
                        aTables.forEach(({ table, title }) => {
                            var oBinding = table.getBinding("items");
                            if (oBinding) {
                                oBinding.refresh();
                                console.log(`Delayed refresh successful for table with title: ${title}`);
                                console.log(`Binding contexts for ${title}:`, oBinding.getContexts());
                            } else {
                                console.error(`Delayed binding for table with title ${title} still not found.`);
                            }
                        });
                    }, 100);

                    oContainer.addContent(new sap.m.VBox({
                        items: [oMainVBox]
                    }));

                    // Load external CSS file dynamically
                    var sCssPath = sap.ui.require.toUrl("com/aispsuppform/aispsupplierform/css/AttachmentsForm.css");
                    if (!sap.ui.getCore().byId("customAttachmentsFormStyles")) {
                        $('<link>')
                            .attr({
                                id: "customAttachmentsFormStyles",
                                rel: "stylesheet",
                                type: "text/css",
                                href: sCssPath
                            })
                            .appendTo('head');
                    }

                    this._bAttachmentSectionCreated = true;
                }

                console.log("Final Attachments in model after setup:", oFormDataModel.getProperty("/Attachments"));
            },

            onDescriptionChange: function (oEvent) {
                var oInput = oEvent.getSource();
                var oContext = oInput.getBindingContext("formDataModel");
                if (!oContext) {
                    console.error("No binding context found for description input");
                    return;
                }

                var sNewDescription = oEvent.getParameter("value");
                var sPath = oContext.getPath();

                // Update the description in the model
                var oFormDataModel = this.getView().getModel("formDataModel");
                oFormDataModel.setProperty(sPath + "/description", sNewDescription);
                console.log(`Description changed to: ${sNewDescription} at path: ${sPath}`);

                // Since description is now independent, we only need to refresh the table where this row belongs
                if (!this._oMainVBox) {
                    console.error("Main VBox not found in controller");
                    return;
                }

                var sTitle = oContext.getProperty("title");
                var oExistingVBox = this._oMainVBox.getItems().find(item => {
                    return item instanceof sap.m.VBox &&
                        item.getItems()[0] instanceof sap.m.Title &&
                        item.getItems()[0].getText() === sTitle;
                });

                if (oExistingVBox) {
                    var oTable = oExistingVBox.getItems()[1];
                    var oBinding = oTable.getBinding("items");
                    if (oBinding) {
                        oBinding.refresh();
                        console.log(`Refreshed table for title: ${sTitle}`);
                    } else {
                        console.error(`No binding found for table with title: ${sTitle}`);
                    }
                } else {
                    console.error(`Table for title ${sTitle} not found`);
                }

                console.log("Current Attachments in model:", oFormDataModel.getProperty("/Attachments"));
            },

            handleUploadComplete: function (oEvent) {
                var sResponse = oEvent.getParameter("response");
                console.log("handleUploadComplete triggered, response:", sResponse);
                if (sResponse) {
                    var oContext = oEvent.getSource().getBindingContext("formDataModel");
                    if (oContext) {
                        var sFileName = oEvent.getParameter("fileName");
                        var oFormDataModel = this.getView().getModel("formDataModel");
                        oFormDataModel.setProperty(oContext.getPath() + "/fileName", sFileName);
                        oFormDataModel.setProperty(oContext.getPath() + "/uploaded", true);

                        var oFile = oEvent.getParameter("files")[0];
                        if (oFile) {
                            var reader = new FileReader();
                            reader.onload = function (e) {
                                var base64String = e.target.result.split(',')[1];
                                var mimeType = oFile.type || "image/png";
                                var imageUrl = "data:" + mimeType + ";base64," + base64String;
                                oFormDataModel.setProperty(oContext.getPath() + "/imageUrl", imageUrl);
                                console.log("File uploaded and converted to base64:", sFileName, "imageUrl:", imageUrl);
                            };
                            reader.onerror = function (e) {
                                console.error("Error reading file:", e);
                            };
                            reader.readAsDataURL(oFile);
                        }
                    }
                } else {
                    console.warn("No response in uploadComplete, relying on change event");
                }
            },

            handleValueChange: function (oEvent) {
                var oFileUploader = oEvent.getSource();
                var oContext = oFileUploader.getBindingContext("formDataModel");
                if (oContext) {
                    var oFormDataModel = this.getView().getModel("formDataModel");
                    var sPath = oContext.getPath();
                    var oFile = oEvent.getParameter("files") && oEvent.getParameter("files")[0];
                    if (oFile) {
                        oFormDataModel.setProperty(sPath + "/fileName", oFile.name);
                        oFormDataModel.setProperty(sPath + "/uploaded", true);

                        var reader = new FileReader();
                        reader.onload = function (e) {
                            var base64String = e.target.result.split(',')[1];
                            var mimeType = oFile.type || "image/png";
                            var imageUrl = "data:" + mimeType + ";base64," + base64String;
                            oFormDataModel.setProperty(sPath + "/imageUrl", imageUrl);
                            console.log("Change event: File converted to base64:", oFile.name, "imageUrl:", imageUrl);
                        };
                        reader.onerror = function (e) {
                            console.error("Error reading file in change:", e);
                        };
                        reader.readAsDataURL(oFile);
                    } else {
                        oFormDataModel.setProperty(sPath + "/fileName", oFileUploader.getValue());
                        console.log("Value changed, fileName updated:", oFileUploader.getValue());
                    }
                }
            },

            handleTypeMissmatch: function (oEvent) {
                var aFileTypes = oEvent.getSource().getFileType().join(", ");
                sap.m.MessageBox.error("The file type *." + oEvent.getParameter("fileType") +
                    " is not supported. Please upload only *." + aFileTypes + " files.");
            },

            buildPayload: function () {
                var oFormData = this.getView().getModel("formDataModel").getData();
                var oDisclosureModel = this.getView().getModel("disclosureModel").getData();
                var payload = {
                    action: this.status === 7 ? "EDIT_RESUBMIT" : "CREATE",
                    stepNo: 1,
                    reqHeader: [{
                        REGISTERED_ID: oFormData["Supplier Information"]["Supplier Information"]["REGISTERED_ID"]?.value || "troyi@gmail.com",
                        WEBSITE: oFormData["Supplier Information"]["Supplier Information"]["WEBSITE"]?.value || "web design",
                        VENDOR_NAME1: oFormData["Supplier Information"]["Supplier Information"]["Company Code"]?.value || "NATO",
                        COMPLETED_BY: oFormData["Submission"]["Declaration"]["COMPLETED_BY"]?.value || "Vaibhav",
                        DESIGNATION: oFormData["Submission"]["Declaration"]["DESIGNATION"]?.value || "User",
                        SUBMISSION_DATE: oFormData["Submission"]["Declaration"]["SUBMISSION_DATE"]?.value || "11-02-2025",
                        // COMPANY_CODE: oFormData["Supplier Information"]["Supplier Information"]["COMPANY_CODE"]?.value || "5000",
                        REQUEST_TYPE: "Create Supplier"
                    }],
                    addressData: oFormData["Supplier Information"]["Address"].map(address => ({
                        STREET: address.HOUSE_NUM1?.value || "12/5 B",
                        STREET1: address.STREET1?.value || "123",
                        STREET2: address.STREET2?.value || "fc road",
                        STREET3: address.STREET3?.value || "pune",
                        STREET4: address.STREET4?.value || "pune",
                        COUNTRY: address.COUNTRY?.value || "India",
                        STATE: address.STATE?.value || "Maharashtra",
                        ADDRESS_TYPE: address.ADDRESS_TYPE || "VENDOR",
                        CITY: address.CITY?.value || "PUNE",
                        POSTAL_CODE: address.POSTAL_CODE?.value || "416006",
                        EMAIL: address.EMAIL?.value || "p5ak7@edny.net",
                        CONTACT_NO: address.CONTACT_NO?.value || "1234567890"
                    })),
                    contactsData: [{
                        FIRST_NAME: oFormData["Supplier Information"]["Primary Contact"]["FIRST_NAME"]?.value.split(" ")[0] || "John",
                        LAST_NAME: oFormData["Supplier Information"]["Primary Contact"]["LAST_NAME"]?.value.split(" ")[1] || "Doe",
                        CITY: oFormData["Supplier Information"]["Primary Contact"]["CITY"]?.value || "New York",
                        STATE: oFormData["Supplier Information"]["Primary Contact"]["STATE"]?.value || "NY",
                        COUNTRY: oFormData["Supplier Information"]["Primary Contact"]["COUNTRY"]?.value || "india",
                        POSTAL_CODE: oFormData["Supplier Information"]["Primary Contact"]["POSTAL_CODE"]?.value || "10001",
                        DESIGNATION: oFormData["Supplier Information"]["Primary Contact"]["DESIGNATION"]?.value || "Procurement Manager",
                        EMAIL: oFormData["Supplier Information"]["Primary Contact"]["EMAIL"]?.value || "john.doe@example.com",
                        CONTACT_NO: oFormData["Supplier Information"]["Primary Contact"]["CONTACT_NUMBER"]?.value || "+1-1234567890",
                        MOBILE_NO: oFormData["Supplier Information"]["Primary Contact"]["MOBILE"]?.value || "+1-9876543210"
                    }],
                    bankData: oFormData["Finance Information"]["Primary Bank details"].map(bank => ({
                        BANK_SECTION: bank.BANK_TYPE || "PRIMARY",
                        SWIFT_CODE: bank.SWIFT_CODE?.value || "123",
                        BRANCH_NAME: bank.BRANCH_NAME?.value || "MUMBAI BRANCH",
                        // IFSC: bank.IFSC?.value || "123456789",
                        BANK_COUNTRY: bank.BANK_COUNTRY?.value || "India",
                        BANK_NAME: bank.BANK_NAME?.value || "Maharashtra Bank",
                        BENEFICIARY: bank.BENEFICIARY?.value || "lAKSHYA",
                        ACCOUNT_NO: bank.ACCOUNT_NO?.value || "1234567890",
                        ACCOUNT_NAME: bank.ACCOUNT_NAME?.value || "SANJU CS",
                        IBAN_NUMBER: bank.IBAN_NUMBER?.value || "56787656789",
                        ROUTING_CODE: bank.ROUTING_CODE?.value || "56789",
                        // OTHER_CODE_NAME: bank.OTHER_CODE_NAME?.value || "IFSC CODE",
                        // OTHER_CODE_VAL: bank.OTHER_CODE_VAL?.value || "IDIB000K501",
                        BANK_CURRENCY: bank.BANK_CURRENCY?.value || "INR",
                        GST: oFormData["Finance Information"]["TAX-VAT-GST"].GST_NO?.value || "29HYDUDDD8U8",
                        GSTYES_NO: oFormData["Finance Information"]["TAX-VAT-GST"]["TAX/VAT/GST"].value || "YES",

                    })),

                    Operational_Prod_Desc: [{
                        PROD_NAME: oFormData["Operational Information"]["Product-Service Description"]["PRODUCT_NAME"]?.value || "NAME",
                        PROD_DESCRIPTION: oFormData["Operational Information"]["Product-Service Description"]["PRODUCT_DESCRIPTION"]?.value || "100 KG",
                        PROD_TYPE: oFormData["Operational Information"]["Product-Service Description"]["PRODUCT_TYPE"]?.value || "TEST",
                        PROD_CATEGORY: oFormData["Operational Information"]["Product-Service Description"]["PRODUCT_CATEGORY"]?.value || "Pune"
                    }],
                    Operational_Capacity: [{
                        TOTAL_PROD_CAPACITY: oFormData["Operational Information"]["Operational Capacity"]["PRODUCTION_CAPACITY"]?.value || "5000 Tons/Year",
                        MINIMUM_ORDER_SIZE: oFormData["Operational Information"]["Operational Capacity"]["ORDER_SIZE_MIN"]?.value || "100 KG",
                        MAXMIMUM_ORDER_SIZE: oFormData["Operational Information"]["Operational Capacity"]["ORDER_SIZE_MAX"]?.value || "5000 KG",
                        CITY: oFormData["Operational Information"]["Operational Capacity"]["PRODUCTION_LOCATION"]?.value || "Pune"
                    }],
                    Disclosure_Fields: [{
                        INTEREST_CONFLICT: (function () {
                            var value = oDisclosureModel["conflictofinterest"];
                            return value === 0 ? "YES" : value === 1 ? "NO" : "NA";
                        })(),
                        ANY_LEGAL_CASES: (function () {
                            var value = oDisclosureModel["legalcasedisclosure"];
                            return value === 0 ? "YES" : value === 1 ? "NO" : "NA";
                        })(),
                        ABAC_REG: (function () {
                            var value = oDisclosureModel["anticorruptionantibriberyregulation"];
                            return value === 0 ? "YES" : value === 1 ? "NO" : "NA";
                        })(),
                        CONTROL_REGULATION: (function () {
                            var value = oDisclosureModel["indianexportcontrol"];
                            return value === 0 ? "YES" : value === 1 ? "NO" : "NA";
                        })()
                    }],
                    Quality_Certificates: Object.keys(oFormData["Quality Certificates"]["Standard Certifications"])
                        .filter(key => key.endsWith("_DONE_BY"))
                        .map(key => {
                            const certName = key.replace("_DONE_BY", "").replace(/_/g, " ");
                            return {
                                CERTI_NAME: certName,
                                CERTI_TYPE: certName.split(" ")[0], // Extract first part as CERTI_TYPE (e.g., "ISO" from "ISO 9001:2015")
                                AVAILABLE: oFormData["Quality Certificates"]["Standard Certifications"][key].value ? "YES" : "NO",
                                DONE_BY: oFormData["Quality Certificates"]["Standard Certifications"][key].value || ""
                            };
                        }),
                    Attachments: oFormData["Attachments"].map(attachment => {
                        const url = attachment.imageUrl || "";
                        const isBase64 = url.startsWith("data:");

                        return {
                            REGESTERED_MAIL: oFormData["Supplier Information"]["Supplier Information"]["REGISTERED_ID"]?.value || "p5ak7@edny.net",
                            DESCRIPTION: attachment.description,
                            ATTACH_SHORT_DEC: attachment.title,
                            IMAGEURL: isBase64
                                ? url.split(",")[1] || url  // use base64 content or fallback
                                : url,                      // use full URL for existing
                            IMAGE_FILE_NAME: attachment.fileName
                        };
                    })
                };

                console.log("Final Payload:", payload);
                return payload;
            },

            submitForm: function () {
                this.getView().setBusy(true)
                var oPayload = this.buildPayload();
                debugger;
                var oModel = this.getView().getModel("regModel"); // OData model ("admin")

                // Validate mandatory fields before submission
                // var bValid = this.validateForm(oPayload);
                // if (!bValid) {
                //     MessageBox.error("Please fill all mandatory fields before submitting.");
                //     return;
                // }

                // Perform OData create call to "PostRegData" entity
                oModel.create("/PostRegData", oPayload, {
                    success: function (oData, oResponse) {
                        this.getView().setBusy(false)
                        MessageBox.success("Form submitted successfully!", {
                            onClose: function () {
                                this.getOwnerComponent().getRouter().navTo("RouteInstructionView");
                            }.bind(this)
                        });
                    }.bind(this),
                    error: function (oError) {
                        console.error("Error submitting form:", oError);
                        this.getView().setBusy(false)
                        var sMessage = "Failed to submit the form.";
                        if (oError.responseText) {
                            try {
                                var oErrorResponse = JSON.parse(oError.responseText);
                                sMessage = oErrorResponse.error.message.value || sMessage;
                            } catch (e) {
                                sMessage = oError.responseText;
                            }
                        }
                        MessageBox.error(sMessage);
                    }.bind(this)
                });
            },

            createSubmission: function (submissionData) {
                if (!submissionData || !submissionData.Declaration) {
                    console.error("Invalid or empty submission data:", submissionData);
                    return;
                }

                var oContainer = this.getView().byId(this.getView().createId("SubmissionFormContainer"));
                if (!oContainer) {
                    console.error("SubmissionFormContainer not found. Check your view XML.");
                    return;
                }

                oContainer.removeAllContent();
                console.log("Submission container cleared:", oContainer);

                // Main VBox for the Submission section
                var oMainVBox = new sap.m.VBox().addStyleClass("submissionSection");

                // VBox to hold the two HBoxes
                var oContentVBox = new sap.m.VBox().addStyleClass("submissionContent");

                // First HBox for Labels and Inputs
                var oLabelsHBox = new sap.m.HBox({
                    justifyContent: "SpaceBetween",
                    alignItems: "Start"
                }).addStyleClass("submissionLabels");

                // Completed By
                var oCompletedByLabel = new sap.m.Label({
                    text: "Completed By",
                    required: true
                }).addStyleClass("mandatoryLabel");
                var oCompletedByInput = new sap.m.Input({
                    value: "{formDataModel>/Submission/Declaration/COMPLETED_BY/value}",
                    placeholder: "Enter Completed By",
                    required: true
                }).addStyleClass("submissionInput");
                oLabelsHBox.addItem(oCompletedByLabel);
                oLabelsHBox.addItem(oCompletedByInput);

                // Designation
                var oDesignationLabel = new sap.m.Label({
                    text: "Designation",
                    required: true
                }).addStyleClass("mandatoryLabel");
                var oDesignationInput = new sap.m.Input({
                    value: "{formDataModel>/Submission/Declaration/DESIGNATION/value}",
                    placeholder: "Enter Designation",
                    required: true
                }).addStyleClass("submissionInput");
                oLabelsHBox.addItem(oDesignationLabel);
                oLabelsHBox.addItem(oDesignationInput);

                // Submission Date
                var sDateValue = submissionData.Declaration.SUBMISSION_DATE.value || "";
                if (!sDateValue) {
                    var oCurrentDate = new Date("2025-04-28"); // Current date as per context
                    sDateValue = oCurrentDate.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                    }).split("/").join("-"); // Format as DD-MM-YYYY
                    this.getView().getModel("formDataModel").setProperty("/Submission/Declaration/SUBMISSION_DATE/value", sDateValue);
                }
                var oDateLabel = new sap.m.Label({
                    text: "Submission Date",
                    required: true
                }).addStyleClass("mandatoryLabel");
                var oDatePicker = new sap.m.DatePicker({
                    value: "{formDataModel>/Submission/Declaration/SUBMISSION_DATE/value}",
                    displayFormat: "dd-MM-yyyy",
                    valueFormat: "dd-MM-yyyy",
                    required: true
                }).addStyleClass("submissionInput");
                oLabelsHBox.addItem(oDateLabel);
                oLabelsHBox.addItem(oDatePicker);

                // Second HBox for Checkbox and Text
                var oCheckboxHBox = new sap.m.HBox({
                    justifyContent: "Start",
                    alignItems: "Start"
                }).addStyleClass("submissionCheckbox");

                // Declaration Checkbox and Text
                var sAckValue = submissionData.Declaration.ACK_VALIDATION.value || "false";
                if (sAckValue === "true") {
                    this.getView().getModel("formDataModel").setProperty("/Submission/Declaration/ACK_VALIDATION/value", true);
                } else {
                    this.getView().getModel("formDataModel").setProperty("/Submission/Declaration/ACK_VALIDATION/value", false);
                }
                var oCheckBox = new sap.m.CheckBox({
                    selected: "{formDataModel>/Submission/Declaration/ACK_VALIDATION/value}",
                    required: true
                }).addStyleClass("submissionCheckbox");
                var oDeclarationText = new sap.m.Text({
                    text: submissionData.Declaration.ACK_VALIDATION.description,
                    wrapping: true,
                    textAlign: "Left"
                }).addStyleClass("declarationText boldText");
                oCheckboxHBox.addItem(new sap.m.Label({
                    text: "",
                    required: true
                }));
                oCheckboxHBox.addItem(oCheckBox);
                oCheckboxHBox.addItem(oDeclarationText);

                // Add HBoxes to VBox
                oContentVBox.addItem(oLabelsHBox);
                oContentVBox.addItem(oCheckboxHBox);

                // Add content to main VBox
                oMainVBox.addItem(oContentVBox);

                oContainer.addContent(oMainVBox);

                // Bind the model
                oContainer.setModel(this.getView().getModel("formDataModel"), "formDataModel");
            },





            onAddOtherOfficeAddress: function () {
                var oFormDataModel = this.getView().getModel("formDataModel");
                var formData = oFormDataModel.getData();
                var primaryAddress = formData["Supplier Information"]["Address"].find(addr => addr.ADDRESS_TYPE === "Primary");
                var otherOfficeAddress = JSON.parse(JSON.stringify(primaryAddress));
                otherOfficeAddress.ADDRESS_TYPE = "Other Office Address";
                formData["Supplier Information"]["Address"].push(otherOfficeAddress);
                oFormDataModel.setData(formData);
                console.log("Updated formDataModel with Other Office Address:", formData);
                this.createDynamicForm(formData);
                MessageBox.success("Other Office Address section added.");
            },

            onAddOtherBankDetails: function () {
                var oFormDataModel = this.getView().getModel("formDataModel");
                var formData = oFormDataModel.getData();
                var primaryBank = formData["Finance Information"]["Primary Bank details"].find(b => b.BANK_TYPE === "Primary");
                var otherBank = JSON.parse(JSON.stringify(primaryBank));
                otherBank.BANK_TYPE = "Other Bank Details";
                formData["Finance Information"]["Primary Bank details"].push(otherBank);
                oFormDataModel.setData(formData);
                console.log("Updated formDataModel with Other Bank Details:", formData);
                this.createDynamicForm(formData);
                MessageBox.success("Other Bank Details section added.");
            },

            onCancel: function () {
                MessageBox.confirm("Are you sure you want to cancel?", {
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            this.getOwnerComponent().getRouter().navTo("home");
                        }
                    }.bind(this)
                });
            },






            // Helper function to validate mandatory fields
            validateForm: function (oPayload) {
                var bValid = true;
                var oFormData = this.getView().getModel("formDataModel").getData();

                // Validate each section
                Object.keys(oFormData).forEach(function (section) {
                    if (section === "Attachments") {
                        // Attachments validation can be customized based on your requirements
                        oFormData[section].forEach(function (attachment) {
                            if (attachment.uploaded === false) {
                                console.warn("Attachment not uploaded:", attachment.description);
                                bValid = false;
                            }
                        });
                    } else {
                        Object.keys(oFormData[section]).forEach(function (category) {
                            if (category === "Address" || category === "Primary Bank details") {
                                oFormData[section][category].forEach(function (item) {
                                    Object.keys(item).forEach(function (fieldKey) {
                                        if (fieldKey !== (category === "Address" ? "ADDRESS_TYPE" : "BANK_TYPE")) {
                                            var field = item[fieldKey];
                                            if (field.mandatory && (!field.value || field.value.trim() === "")) {
                                                console.warn("Mandatory field empty:", section, category, fieldKey);
                                                bValid = false;
                                            }
                                        }
                                    });
                                });
                            } else {
                                Object.keys(oFormData[section][category]).forEach(function (fieldKey) {
                                    var field = oFormData[section][category][fieldKey];
                                    if (field.mandatory && (!field.value || field.value.trim() === "")) {
                                        console.warn("Mandatory field empty:", section, category, fieldKey);
                                        bValid = false;
                                    }
                                });
                            }
                        });
                    }
                });

                // Validate Disclosure section
                var oDisclosureModel = this.getView().getModel("disclosureModel");
                if (oDisclosureModel && oFormData["Disclosures"]) {
                    Object.keys(oFormData["Disclosures"]).forEach(function (category) {
                        Object.keys(oFormData["Disclosures"][category]).forEach(function (fieldKey) {
                            var field = oFormData["Disclosures"][category][fieldKey];
                            if (field.mandatory) {
                                var propertyName = field.label.toLowerCase().replace(/ /g, '').replace('&', '').replace('-', '');
                                var value = oDisclosureModel.getProperty("/" + propertyName);
                                if (value === undefined || value === null) {
                                    console.warn("Mandatory disclosure field not selected:", field.label);
                                    bValid = false;
                                }
                            }
                        });
                    });
                }

                return bValid;
            },

            onWizardFinish: function () {
                // Call submitForm instead of just building the payload
                this.submitForm();
            },
        });
    }
);