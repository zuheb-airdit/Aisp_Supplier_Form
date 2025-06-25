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
        "sap/ui/core/Icon",
        "sap/m/HBox",
        "sap/m/ColumnListItem",
        "sap/ui/core/Core",
        "sap/ui/core/Fragment"
    ],
    function (Controller, MessageBox, JSONModel, SimpleForm, Label, Input, Button, Toolbar, ToolbarSpacer, Title, ComboBox, VBox, RadioButton, RadioButtonGroup, Table, Column, Text, FileUploader, Icon, HBox, ColumnListItem, Core, Fragment) {
        "use strict";

        return Controller.extend("com.requestmanagement.requestmanagement.controller.Registrationform", {
            onInit: function () {
                let oModel = this.getOwnerComponent().getModel("admin");
                let mainModel = this.getOwnerComponent().getModel("registration-manage");
                this.getView().setModel(mainModel, "regModel")
                let formModel = this.getOwnerComponent().getModel("formData");
                this.getView().setModel(formModel, "formDataModel");
                this.getView().setModel(oModel);
                let oRegModel = this.getOwnerComponent().getModel("registration-manage");
                this.getView().setModel(oRegModel, "oRegModel");
                this._initializeDisclosureModel();
                this.getView().byId("vendorWizard").getSteps()[0].setValidated(true);
                this.getOwnerComponent()
                    .getRouter()
                    .getRoute("Registrationform")
                    .attachPatternMatched(this._onRouteMatchedwithoutid, this);

                this.getOwnerComponent()
                    .getRouter()
                    .getRoute("RequestSendBack")
                    .attachPatternMatched(this._onRouteMatchedwithreqsendback, this);

                this.getView().byId("vendorWizard").getSteps()[0].setValidated(true);
                this._bAttachmentSectionCreated = false;
            },

            _onRouteMatchedwithreqsendback: async function (oEvent) {
                const args = oEvent.getParameter("arguments");
                this.REQUEST_NO = args.requestNumber;
                this.REQUEST_TYPE = args.requestType;

                const oModel = this.getView().getModel("registration-manage");
                const anotherModel = this.getView().getModel()

                try {
                    // debugger;
                    /* ── 1. RequestInfo ─────────────────────────────── */
                    const reqInfo = await new Promise((resolve, reject) => {
                        oModel.read(`/RequestInfo(${this.REQUEST_NO})`, { success: resolve, error: reject });
                    });
                    this.responseData = { ...reqInfo };
                    console.log(this.responseData);// plain object copy
                    const aFilters = [
                        new sap.ui.model.Filter("COMPANY_CODE", sap.ui.model.FilterOperator.EQ, this.responseData.COMPANY_CODE),
                        new sap.ui.model.Filter("REQUEST_TYPE", sap.ui.model.FilterOperator.EQ, this.REQUEST_TYPE)
                    ];
                    const fieldCfgRes = await new Promise((resolve, reject) => {
                        anotherModel.read("/FieldConfig", { filters: aFilters, success: resolve, error: reject });
                    });
                    const fieldConfig = fieldCfgRes.results || fieldCfgRes.value || fieldCfgRes;
                    if (!fieldConfig || (Array.isArray(fieldConfig) && fieldConfig.length === 0)) {
                        MessageBox.error("No field configuration data available for selected company code.");
                        return;
                    }
                    const formDataModel = this.buildFormDataBySectionCategory(fieldConfig, "sendback");
                    debugger;
                    console.log(formDataModel);
                    var oFormDataModel = new JSONModel(formDataModel);
                    this.getView().setModel(oFormDataModel, "formDataModel");
                    let data = oFormDataModel.getData();
                    this.createDynamicForm(data, "sendback");
                } catch (err) {
                    console.error(err);
                    sap.m.MessageToast.show("Failed to load data");
                }
            },

            _initializeDisclosureModel: function () {
                var oDisclosureModel = new JSONModel({});
                this.getView().setModel(oDisclosureModel, "disclosureModel");
                // console.log("Disclosure model initialized:", oDisclosureModel.getData());
            },

            _onRouteMatchedwithoutid: function (oEvent) {
                debugger;
                var oArguments = oEvent.getParameter("arguments");
                this.COMPANY_CODE = oArguments.companyCode;
                this.REQUEST_TYPE = oArguments.requestType;

                let oModel = this.getView().getModel();

                var aFilters = [
                    new sap.ui.model.Filter("COMPANY_CODE", sap.ui.model.FilterOperator.EQ, this.COMPANY_CODE),
                    new sap.ui.model.Filter("REQUEST_TYPE", sap.ui.model.FilterOperator.EQ, this.REQUEST_TYPE)
                ];

                console.log("Fetching FieldConfig from OData model:", oModel);

                // Set view to busy
                this.getView().setBusy(true);

                oModel.read("/FieldConfig", {
                    filters: aFilters,
                    success: function (res) {
                        // Remove busy state
                        this.getView().setBusy(false);

                        console.log("FieldConfig response:", res);
                        var fieldConfig = res.results || res.value || res;
                        if (!fieldConfig || (Array.isArray(fieldConfig) && fieldConfig.length === 0)) {
                            console.error("No field configuration data received");
                            MessageBox.error(
                                "Required configuration for this form is missing. You'll be redirected to the request management screen.",
                                {
                                    onClose: function () {
                                        this.getOwnerComponent().getRouter().navTo("RouteRequestManagement");
                                    }.bind(this)
                                }
                            );
                            return;
                        }

                        var formDataModel = this.buildFormDataBySectionCategory(fieldConfig, "registration");
                        console.log("Form data model:", formDataModel);

                        var oFormDataModel = new JSONModel(formDataModel);
                        this.getView().setModel(oFormDataModel, "formDataModel");
                        let data = oFormDataModel.getData();
                        this.createDynamicForm(data, "registration");
                    }.bind(this),
                    error: function (err) {
                        // Remove busy state
                        this.getView().setBusy(false);

                        console.error("Error fetching FieldConfig:", err);
                        MessageBox.error("Failed to load field configuration: " + err.message);
                    }.bind(this)
                });
            },

            buildFormDataBySectionCategory: function (fields, type) {
                this.currentType = type;
                const model = {
                    Attachments: [] // Initialize Attachments at the root level
                };
                console.log("Building form data from fields:", fields, type);

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
                            imageUrl: "",
                            mandatory: !!field.IS_MANDATORY,
                            visible: !!field.IS_VISIBLE,
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

                    const fieldData = {
                        label: field.FIELD_LABEL,
                        mandatory: !!field.IS_MANDATORY,
                        visible: !!field.IS_VISIBLE,
                        type: field.FIELD_TYPE || "",
                        description: field.DESCRIPTION || "",
                        value: field.DEFAULT_VALUE || "",
                        fieldId: field.FIELD_ID || "",
                        companyCode: field.COMPANY_CODE || "",
                        requestType: field.REQUEST_TYPE || "",
                        minimum: field.MINIMUM || "",
                        maximum: field.MAXIMUM || "",
                        placeholder: field.PLACEHOLDER || "",
                        dropdownValues: field.DROPDOWN_VALUES || "",
                        newDynamicFormField: !!field.NEW_DYANAMIC_FORM_FIELD
                    };

                    if (category === "Address" && key !== "ADDRESS_TYPE") {
                        model[section][category][0][key] = fieldData;
                    } else if (category === "Primary Bank details" && key !== "BANK_TYPE") {
                        model[section][category][0][key] = fieldData;
                    } else if (category !== "Address" && category !== "Primary Bank details") {
                        model[section][category][key] = fieldData;
                    }
                });

                if (type === "registration") {
                    model["Supplier Information"]["Supplier Information"]["COMPANY_CODE"].value = this.COMPANY_CODE;

                    //filling Dummy data for Testing
                    if (model["Supplier Information"]) {
                        if (model["Supplier Information"]["Supplier Information"]) {
                            model["Supplier Information"]["Supplier Information"]["VENDOR_NAME1"].value = "Innovent Solutions Pvt. Ltd.";
                            model["Supplier Information"]["Supplier Information"]["WEBSITE"].value = "https://innoventsolutions.in";
                            model["Supplier Information"]["Supplier Information"]["REGISTERED_ID"].value = "REG123456789";
                            model["Supplier Information"]["Supplier Information"]["COMPANY_CODE"].value = this.COMPANY_CODE;
                        }

                        if (model["Supplier Information"]["Address"]) {
                            model["Supplier Information"]["Address"][0]["HOUSE_NUM1"].value = "456";
                            model["Supplier Information"]["Address"][0]["STREET1"].value = "Innovation Tower";
                            model["Supplier Information"]["Address"][0]["STREET2"].value = "Sector 5";
                            model["Supplier Information"]["Address"][0]["STREET3"].value = "Technocity";
                            model["Supplier Information"]["Address"][0]["STREET4"].value = "Bangalore";
                            model["Supplier Information"]["Address"][0]["COUNTRY"].value = "India";
                            model["Supplier Information"]["Address"][0]["STATE"].value = "Karnataka";
                            model["Supplier Information"]["Address"][0]["CITY"].value = "Bangalore";
                            model["Supplier Information"]["Address"][0]["POSTAL_CODE"].value = "560103";
                            model["Supplier Information"]["Address"][0]["EMAIL"].value = "contact@innoventsolutions.in";
                            model["Supplier Information"]["Address"][0]["CONTACT_NO"].value = "08012345678";
                        }

                        if (model["Supplier Information"]["Primary Contact"]) {
                            model["Supplier Information"]["Primary Contact"]["FIRST_NAME"].value = "Rahul Verma";
                            model["Supplier Information"]["Primary Contact"]["LAST_NAME"].value = "";
                            model["Supplier Information"]["Primary Contact"]["CITY"].value = "Bangalore";
                            model["Supplier Information"]["Primary Contact"]["STATE"].value = "Karnataka";
                            model["Supplier Information"]["Primary Contact"]["COUNTRY"].value = "India";
                            model["Supplier Information"]["Primary Contact"]["POSTAL_CODE"].value = "560103";
                            model["Supplier Information"]["Primary Contact"]["DESIGNATION"].value = "Vendor Manager";
                            model["Supplier Information"]["Primary Contact"]["EMAIL"].value = "rahul.verma@innoventsolutions.in";
                            model["Supplier Information"]["Primary Contact"]["CONTACT_NUMBER"].value = "+918061234567";
                            model["Supplier Information"]["Primary Contact"]["MOBILE"].value = "+919876543210";
                        }
                    }

                    if (model["Finance Information"]) {
                        if (model["Finance Information"]["Primary Bank details"]) {
                            model["Finance Information"]["Primary Bank details"][0]["SWIFT_CODE"].value = "HDFCINBBXXX";
                            model["Finance Information"]["Primary Bank details"][0]["BRANCH_NAME"].value = "HDFC Koramangala Branch";
                            model["Finance Information"]["Primary Bank details"][0]["BANK_COUNTRY"].value = "India";
                            model["Finance Information"]["Primary Bank details"][0]["BANK_NAME"].value = "HDFC Bank";
                            model["Finance Information"]["Primary Bank details"][0]["BENEFICIARY"].value = "Innovent Solutions Pvt. Ltd.";
                            model["Finance Information"]["Primary Bank details"][0]["ACCOUNT_NO"].value = "987654321001";
                            model["Finance Information"]["Primary Bank details"][0]["IBAN_NUMBER"].value = "IN91HDFC000987654321001";
                            model["Finance Information"]["Primary Bank details"][0]["ROUTING_CODE"].value = "HDFC0000987";
                            model["Finance Information"]["Primary Bank details"][0]["BANK_CURRENCY"].value = "INR";
                            model["Finance Information"]["TAX-VAT-GST"].GST_NO.value = "29AACCI1234M1Z5";
                        }
                    }

                    if (model["Operational Information"]) {
                        if (model["Operational Information"]["Product-Service Description"]) {
                            model["Operational Information"]["Product-Service Description"]["PRODUCT_NAME"].value = "Smart Sensor Kits";
                            model["Operational Information"]["Product-Service Description"]["PRODUCT_DESCRIPTION"].value = "IoT-based smart sensors for industrial automation";
                            model["Operational Information"]["Product-Service Description"]["PRODUCT_TYPE"].value = "Electronics";
                            model["Operational Information"]["Product-Service Description"]["PRODUCT_CATEGORY"].value = "Sensors & Automation";
                        }

                        if (model["Operational Information"]["Operational Capacity"]) {
                            model["Operational Information"]["Operational Capacity"]["ORDER_SIZE_MIN"].value = "100 Units";
                            model["Operational Information"]["Operational Capacity"]["ORDER_SIZE_MAX"].value = "10000 Units";
                            model["Operational Information"]["Operational Capacity"]["PRODUCTION_CAPACITY"].value = "50000 Units/Year";
                            model["Operational Information"]["Operational Capacity"]["PRODUCTION_LOCATION"].value = "Bangalore Industrial Estate";
                        }
                    }

                    // if (model["Quality Certificates"]) {
                    //     if (model["Quality Certificates"]["Standard Certifications"]) {
                    //         Object.keys(model["Quality Certificates"]["Standard Certifications"]).forEach(key => {
                    //             model["Quality Certificates"]["Standard Certifications"][key].value = "Rahul Verma";
                    //             model["Quality Certificates"]["Standard Certifications"][key].isCertified = "Yes";
                    //         });
                    //     }
                    // }

                    // if (model["Submission"]) {
                    //     if (model["Submission"]["Declaration"]) {
                    //         model["Submission"]["Declaration"]["COMPLETED_BY"].value = "Rahul Verma";
                    //         model["Submission"]["Declaration"]["DESIGNATION"].value = "Vendor Manager";
                    //         model["Submission"]["Declaration"]["SUBMISSION_DATE"].value = "2025-05-16";
                    //         model["Submission"]["Declaration"]["ACK_VALIDATION"].value = true;
                    //     }
                    // }
                } else if (type === "sendback") {
                    const r = this.responseData;

                    const sInfo = model["Supplier Information"];
                    if (sInfo) {
                        const sup = sInfo["Supplier Information"];
                        if (sup) {
                            sup["VENDOR_NAME1"].value = r.VENDOR_NAME1 || "";
                            sup["WEBSITE"].value = r.WEBSITE || "";
                            sup["REGISTERED_ID"].value = r.REGISTERED_ID || "";
                            sup["COMPANY_CODE"].value = r.COMPANY_CODE || "";
                            sup["VENDOR_TYPE"].value = `${r.SUPPL_TYPE} - ${r.SUPPL_TYPE_DESC}` || "";
                            sup["VENDOR_SUB_TYPE"].value = `${r.BP_TYPE_CODE} - ${r.BP_TYPE_DESC}` || "";
                        }

                        const addressRows = sInfo["Address"] || [];
                        const addressResults = r.TO_ADDRESS?.results || [];

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

                        if (addressResults[1]) {
                            if (!addressRows[1]) {
                                const copy = JSON.parse(JSON.stringify(addressRows[0]));
                                Object.keys(copy).forEach(k => { if (k !== "ADDRESS_TYPE") copy[k].value = ""; });
                                copy.ADDRESS_TYPE = "Other Office Address";
                                addressRows.push(copy);
                            }

                            const src = addressResults[1];
                            const trg = addressRows[1];

                            trg.ADDRESS_TYPE = "Other Office Address";
                            trg["HOUSE_NUM1"] = trg["HOUSE_NUM1"] || { value: "", fieldId: "", companyCode: "", requestType: "", mandatory: false, visible: true, type: "", description: "", minimum: "", maximum: "", placeholder: "", dropdownValues: "", newDynamicFormField: false };
                            trg["STREET1"] = trg["STREET1"] || { value: "", fieldId: "", companyCode: "", requestType: "", mandatory: false, visible: true, type: "", description: "", minimum: "", maximum: "", placeholder: "", dropdownValues: "", newDynamicFormField: false };
                            trg["STREET2"] = trg["STREET2"] || { value: "", fieldId: "", companyCode: "", requestType: "", mandatory: false, visible: true, type: "", description: "", minimum: "", maximum: "", placeholder: "", dropdownValues: "", newDynamicFormField: false };
                            trg["STREET3"] = trg["STREET3"] || { value: "", fieldId: "", companyCode: "", requestType: "", mandatory: false, visible: true, type: "", description: "", minimum: "", maximum: "", placeholder: "", dropdownValues: "", newDynamicFormField: false };
                            trg["STREET4"] = trg["STREET4"] || { value: "", fieldId: "", companyCode: "", requestType: "", mandatory: false, visible: true, type: "", description: "", minimum: "", maximum: "", placeholder: "", dropdownValues: "", newDynamicFormField: false };
                            trg["COUNTRY"] = trg["COUNTRY"] || { value: "", fieldId: "", companyCode: "", requestType: "", mandatory: false, visible: true, type: "", description: "", minimum: "", maximum: "", placeholder: "", dropdownValues: "", newDynamicFormField: false };
                            trg["STATE"] = trg["STATE"] || { value: "", fieldId: "", companyCode: "", requestType: "", mandatory: false, visible: true, type: "", description: "", minimum: "", maximum: "", placeholder: "", dropdownValues: "", newDynamicFormField: false };
                            trg["CITY"] = trg["CITY"] || { value: "", fieldId: "", companyCode: "", requestType: "", mandatory: false, visible: true, type: "", description: "", minimum: "", maximum: "", placeholder: "", dropdownValues: "", newDynamicFormField: false };
                            trg["POSTAL_CODE"] = trg["POSTAL_CODE"] || { value: "", fieldId: "", companyCode: "", requestType: "", mandatory: false, visible: true, type: "", description: "", minimum: "", maximum: "", placeholder: "", dropdownValues: "", newDynamicFormField: false };
                            trg["EMAIL"] = trg["EMAIL"] || { value: "", fieldId: "", companyCode: "", requestType: "", mandatory: false, visible: true, type: "", description: "", minimum: "", maximum: "", placeholder: "", dropdownValues: "", newDynamicFormField: false };
                            trg["CONTACT_NO"] = trg["CONTACT_NO"] || { value: "", fieldId: "", companyCode: "", requestType: "", mandatory: false, visible: true, type: "", description: "", minimum: "", maximum: "", placeholder: "", dropdownValues: "", newDynamicFormField: false };

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

                        const pCon = sInfo["Primary Contact"];
                        if (pCon) {
                            const c = r.TO_CONTACTS?.results?.[0] || {};
                            pCon["FIRST_NAME"].value = c.FIRST_NAME || "";
                            pCon["LAST_NAME"].value = c.LAST_NAME || "";
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

                    const fin = model["Finance Information"];
                    if (fin) {
                        const bankRows = fin["Primary Bank details"] || [];
                        const bankResults = r.TO_BANKS?.results || [];

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

                        if (bankResults[1]) {
                            if (!bankRows[1]) {
                                const copy = JSON.parse(JSON.stringify(bankRows[0]));
                                Object.keys(copy).forEach(k => { if (k !== "BANK_TYPE") copy[k].value = ""; });
                                copy.BANK_TYPE = "Other Bank Details";
                                bankRows.push(copy);
                            }

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

                    // Handle dynamic fields from TO_DYNAMIC_FIELDS
                    if (r && r.TO_DYNAMIC_FIELDS && r.TO_DYNAMIC_FIELDS.results && r.TO_DYNAMIC_FIELDS.results.length > 0) {
                        r.TO_DYNAMIC_FIELDS.results.forEach(dynamicField => {
                            const section = dynamicField.SECTION;
                            const category = dynamicField.CATEGORY;
                            let data;

                            try {
                                data = JSON.parse(dynamicField.DATA);
                            } catch (e) {
                                console.error(`Failed to parse DATA for SECTION: ${section}, CATEGORY: ${category}`, dynamicField.DATA, e);
                                return;
                            }

                            console.log(`Processing dynamic field - SECTION: ${section}, CATEGORY: ${category}, DATA:`, data);

                            // Ensure section and category exist in the model
                            if (!model[section]) {
                                console.warn(`Section ${section} not found in model. Creating it.`);
                                model[section] = {};
                            }
                            if (!model[section][category]) {
                                console.warn(`Category ${category} not found in model for section ${section}. Creating it.`);
                                if (category === "Address") {
                                    model[section][category] = [{ ADDRESS_TYPE: "Primary" }];
                                } else if (category === "Primary Bank details") {
                                    model[section][category] = [{ BANK_TYPE: "Primary" }];
                                } else {
                                    model[section][category] = {};
                                }
                            }

                            // Update fields with dynamic data, ensuring they are applied to the correct category
                            Object.keys(data).forEach(fieldKey => {
                                let fieldValue = data[fieldKey];
                                const normalizedFieldKey = fieldKey.replace(/\s+/g, '_'); // Normalize spaces to underscores

                                // Reformat date fields to YYYY-MM-DD only if the field is explicitly a date field
                                if (normalizedFieldKey.toLowerCase().includes("date") && fieldValue) {
                                    try {
                                        const parsedDate = new Date(fieldValue);
                                        if (!isNaN(parsedDate.getTime())) {
                                            fieldValue = parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD
                                            console.log(`Reformatted date for ${fieldKey}: ${fieldValue}`);
                                        } else {
                                            console.warn(`Invalid date format for ${fieldKey}: ${fieldValue}`);
                                        }
                                    } catch (e) {
                                        console.error(`Error parsing date for ${fieldKey}: ${fieldValue}`, e);
                                    }
                                }

                                if (category === "Address" || category === "Primary Bank details") {
                                    const index = 0; // Assume first entry (e.g., "Primary")
                                    if (!model[section][category][index]) {
                                        model[section][category][index] = category === "Address" ? { ADDRESS_TYPE: "Primary" } : { BANK_TYPE: "Primary" };
                                    }

                                    // Check if the field exists in the model, if not create it
                                    if (!model[section][category][index][normalizedFieldKey]) {
                                        model[section][category][index][normalizedFieldKey] = {
                                            value: "",
                                            label: fieldKey,
                                            mandatory: false,
                                            visible: true,
                                            type: normalizedFieldKey.toLowerCase().includes("date") ? "Date" : "",
                                            description: "",
                                            fieldId: "",
                                            companyCode: "",
                                            requestType: "",
                                            minimum: "",
                                            maximum: "",
                                            placeholder: "",
                                            dropdownValues: "",
                                            newDynamicFormField: true
                                        };
                                    }

                                    // Update the value and mark as dynamic
                                    model[section][category][index][normalizedFieldKey].value = fieldValue;
                                    model[section][category][index][normalizedFieldKey].newDynamicFormField = true;
                                    console.log(`Updated dynamic field in ${section}/${category}[${index}]: ${normalizedFieldKey} = ${fieldValue}`);
                                } else {
                                    // Non-array category (like Product-Service Description)
                                    if (!model[section][category][normalizedFieldKey]) {
                                        model[section][category][normalizedFieldKey] = {
                                            value: "",
                                            label: fieldKey,
                                            mandatory: false,
                                            visible: true,
                                            type: normalizedFieldKey.toLowerCase().includes("date") ? "Date" : "",
                                            description: "",
                                            fieldId: "",
                                            companyCode: "",
                                            requestType: "",
                                            minimum: "",
                                            maximum: "",
                                            placeholder: "",
                                            dropdownValues: "",
                                            newDynamicFormField: true
                                        };
                                    }

                                    // Update the value and mark as dynamic
                                    model[section][category][normalizedFieldKey].value = fieldValue;
                                    model[section][category][normalizedFieldKey].newDynamicFormField = true;
                                    console.log(`Updated dynamic field in ${section}/${category}: ${normalizedFieldKey} = ${fieldValue}`);
                                }
                            });
                        });
                    } else {
                        console.warn("No dynamic fields found in response.");
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
                        const field = disclosure[fieldKey];
                        if (field && fieldKey) {
                            let propertyName = "/" + fieldKey.toLowerCase().replace(/ /g, '').replace('&', '').replace('-', '');
                            const mappedField = fieldMapping[fieldKey];

                            if (r && r.TO_DISCLOSURE_FIELDS && r.TO_DISCLOSURE_FIELDS.results.length > 0) {
                                const disclosureData = r.TO_DISCLOSURE_FIELDS.results[0];
                                let fieldValue = disclosureData[mappedField] || "NA";
                                fieldValue = valueMapping[fieldValue];
                                oDisclosureModelData.setProperty(`/${propertyName}`, fieldValue);
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
                            if (r && r.TO_QA_CERTIFICATES && r.TO_QA_CERTIFICATES.results && r.TO_QA_CERTIFICATES.results.length > 0) {
                                r.TO_QA_CERTIFICATES.results.forEach(cert => {
                                    const certName = `${cert.CERTI_NAME.replace(/ /g, '_')}_DONE_BY`;
                                    if (model["Quality Certificates"]["Standard Certifications"][certName]) {
                                        model["Quality Certificates"]["Standard Certifications"][certName].value = cert.DONE_BY || "N/A";
                                        model["Quality Certificates"]["Standard Certifications"][certName].isCertified = cert.AVAILABLE === "YES" ? "Yes" : "No";
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
                            r.TO_ATTACHMENTS.results.forEach((attachment, index) => {
                                const attachmentData = model["Attachments"][index];
                                if (attachmentData) {
                                    attachmentData.fileName = attachment.IMAGE_FILE_NAME || "";
                                    attachmentData.imageUrl = attachment.IMAGEURL || "";
                                    attachmentData.title = attachment.ATTACH_SHORT_DEC;
                                    attachmentData.description = attachment.DESCRIPTION;
                                    attachmentData.uploaded = true;
                                }
                            });
                            this.getView().getModel("formDataModel").setProperty("/Attachments", model["Attachments"]);
                        } else {
                            console.error("No attachments found in response.");
                        }
                    }

                    const sub = model["Submission"]?.["Declaration"];
                    if (sub) {
                        sub["COMPLETED_BY"].value = r.COMPLETED_BY || "";
                        sub["DESIGNATION"].value = r.DESIGNATION || "";
                        sub["SUBMISSION_DATE"].value = r.SUBMISSION_DATE || "";
                        sub["ACK_VALIDATION"].value = true;
                    }
                }

                console.log("Final model:", JSON.stringify(model, null, 2));
                return model;
            },

            createDynamicForm: function (data, type) {
                console.log("Creating dynamic form with data:", data, type);
                this.createSupplierFormPage(data["Supplier Information"], type);
                this.createFinanceFormPage(data["Finance Information"]);
                this.createOperationalFormPage(data["Operational Information"]);
                this.createDisclosureForm(data["Disclosures"], type);
                this.createQualityCertificatesForm(data["Quality Certificates"]);
                this.createAttachmentsForm(data["Attachments"]);
                // this.createSubmission(data.Submission)
            },

            createSupplierFormPage: function (supplierData, pageType) {
                var oContainer = this.getView().byId("SupplierInformationFormContainer");
                if (!oContainer) {
                    console.error("SupplierInformationFormContainer not found");
                    MessageBox.error("Form container not found.");
                    return;
                }
                oContainer.removeAllContent();

                const sections = {
                    "Supplier Information": supplierData["Supplier Information"],
                    "Address": supplierData["Address"],
                    "Primary Contact": supplierData["Primary Contact"]
                };

                Object.keys(sections).forEach(function (sectionName) {
                    const sectionData = sections[sectionName];
                    if (!sectionData) return;

                    if (sectionName === "Address") {
                        sectionData.forEach(function (address, index) {
                            const addressType = address.ADDRESS_TYPE;
                            const oVBox = new VBox({ class: "sapUiSmallMarginBottom" });

                            const showAddBtn =
                                pageType === "registration" &&
                                addressType === "Primary" &&
                                !sectionData.some(a => a.ADDRESS_TYPE === "Other Office Address");

                            const oTitleBar = new Toolbar({
                                content: [
                                    new Title({ text: `${addressType} Address`, level: "H3" }),
                                    new ToolbarSpacer(),
                                    showAddBtn ? new Button({
                                        text: "Add Other Office Address",
                                        icon: "sap-icon://add",
                                        type: "Emphasized",
                                        press: this.onAddOtherOfficeAddress.bind(this)
                                    }) : null
                                ].filter(Boolean)
                            });

                            const oForm = new SimpleForm({
                                editable: true,
                                layout: "ColumnLayout",
                                labelSpanXL: 3,
                                labelSpanL: 3,
                                labelSpanM: 4,
                                labelSpanS: 12,
                                adjustLabelSpan: false,
                                columnsXL: 2,
                                columnsL: 2,
                                columnsM: 1,
                                singleContainerFullSize: false
                            });

                            Object.keys(address).forEach(function (fieldKey) {
                                if (fieldKey === "ADDRESS_TYPE") return;
                                const field = address[fieldKey];
                                if (!field.visible) return;

                                const oLabel = new Label({ text: field.label, required: field.mandatory });
                                let oField;

                                switch (field.type.toLowerCase()) {
                                    // In the Address section
                                    case "f4help":
                                        let valueHelpHandler;
                                        if (fieldKey === "VENDOR_TYPE" || field.label.toLowerCase().includes("vendor type")) {
                                            valueHelpHandler = function (oEvent) {
                                                console.log("VENDOR_TYPE value help triggered:", { sectionName, fieldKey, index });
                                                this.onValueHelpVendorFrag(oEvent.getSource(), sectionName, fieldKey, index);
                                            }.bind(this);
                                        } else if (fieldKey === "VENDOR_SUB_TYPE" || field.label.toLowerCase().includes("vendor sub type")) {
                                            valueHelpHandler = function (oEvent) {
                                                console.log("VENDOR_SUB_TYPE value help triggered:", { sectionName, fieldKey, index });
                                                this.onValueHelpSubVendorFrag
                                                    ? this.onValueHelpSubVendorFrag(oEvent.getSource(), sectionName, fieldKey, index)
                                                    : console.log("onValueHelpSubVendorFrag not implemented");
                                            }.bind(this);
                                        } else {
                                            valueHelpHandler = function () {
                                                console.log(`No value help handler defined for ${fieldKey}`);
                                            }.bind(this);
                                        }

                                        oField = new Input({
                                            value: `{formDataModel>/Supplier Information/Address/${index}/${fieldKey}/value}`,
                                            // id: this.createId(`input_${this._sanitizeId(sectionName)}_${fieldKey}_${index}`),
                                            showValueHelp: true,
                                            valueHelpRequest: valueHelpHandler,
                                            suggestionItems: field.suggestionPath ? {
                                                path: field.suggestionPath,
                                                template: new sap.ui.core.ListItem({
                                                    key: "{SPRAS}",
                                                    text: "{SPRAS}",
                                                    additionalText: fieldKey === "VENDOR_TYPE" ? "{TXT40}" : "{TXT30}"
                                                })
                                            } : undefined,
                                            suggestionItemSelected: this.onSuggestionItemSelected ? this.onSuggestionItemSelected.bind(this) : undefined,
                                            change: function (oEvent) {
                                                const value = oEvent.getSource().getValue();
                                                const oModel = this.getView().getModel("formDataModel");
                                                if (oModel) {
                                                    oModel.getData()["Supplier Information"]["Address"][index][fieldKey].value = value;
                                                    oModel.refresh();
                                                } else {
                                                    console.warn("formDataModel not found.");
                                                }
                                            }.bind(this)
                                        });
                                        break;
                                    case "dropdown":
                                        if (fieldKey === "COUNTRY") {
                                            oField = new sap.m.Select({
                                                required: field.mandatory,
                                                selectedKey: field.defaultValue || field.value || "IN",
                                                items: {
                                                    path: "/Country",
                                                    sorter: new sap.ui.model.Sorter("LANDX", false),
                                                    template: new sap.ui.core.Item({
                                                        key: "{LAND1}",
                                                        text: "{LANDX}"
                                                    })
                                                },
                                                change: function (oEvent) {
                                                    const selectedKey = oEvent.getSource().getSelectedKey();
                                                    const oModel = this.getView().getModel("formDataModel");
                                                    const path = `/Supplier Information/Address/${index}/${fieldKey}/value`;
                                                    oModel.setProperty(path, selectedKey);
                                                }.bind(this)
                                            });
                                        } else {
                                            const dropdownOptions = field.dropdownValues ? field.dropdownValues.split(",").map(opt => opt.trim()) : ["Option 1", "Option 2"];
                                            const items = [
                                                new sap.ui.core.Item({ key: "", text: field.placeholder || "Select an option" }),
                                                ...dropdownOptions.map(opt => new sap.ui.core.Item({ key: opt, text: opt }))
                                            ];
                                            oField = new sap.m.Select({
                                                required: field.mandatory,
                                                selectedKey: field.defaultValue || field.value || "",
                                                items: items,
                                                change: function (oEvent) {
                                                    const selectedKey = oEvent.getSource().getSelectedKey();
                                                    const oModel = this.getView().getModel("formDataModel");
                                                    const path = `/Supplier Information/Address/${index}/${fieldKey}/value`;
                                                    oModel.setProperty(path, selectedKey);
                                                }.bind(this)
                                            });
                                        }
                                        break;

                                    case "checkbox":
                                        oField = new sap.m.CheckBox({
                                            selected: field.value === "true" || field.value === true,
                                            select: function (oEvent) {
                                                const selected = oEvent.getSource().getSelected();
                                                const oModel = this.getView().getModel("formDataModel");
                                                const path = `/Supplier Information/Address/${index}/${fieldKey}/value`;
                                                oModel.setProperty(path, selected);
                                            }.bind(this)
                                        });
                                        break;

                                    case "radio":
                                        oField = new RadioButtonGroup({
                                            selectedIndex: field.value === "Yes" ? 0 : field.value === "No" ? 1 : -1,
                                            buttons: [
                                                new RadioButton({ text: "Yes" }),
                                                new RadioButton({ text: "No" })
                                            ],
                                            select: function (oEvent) {
                                                const selectedIndex = oEvent.getSource().getSelectedIndex();
                                                const value = selectedIndex === 0 ? "Yes" : "No";
                                                const oModel = this.getView().getModel("formDataModel");
                                                const path = `/Supplier Information/Address/${index}/${fieldKey}/value`;
                                                oModel.setProperty(path, value);
                                            }.bind(this)
                                        });
                                        break;

                                    case "number":
                                        oField = new Input({
                                            value: field.value,
                                            type: "Number",
                                            required: field.mandatory,
                                            visible: field.visible,
                                            min: field.minimum ? parseFloat(field.minimum) : undefined,
                                            max: field.maximum ? parseFloat(field.maximum) : undefined,
                                            placeholder: field.placeholder || "",
                                            valueStateText: field.mandatory ? `${field.label} is required` : "",
                                            change: function (oEvent) {
                                                const value = oEvent.getSource().getValue();
                                                const oModel = this.getView().getModel("formDataModel");
                                                const path = `/Supplier Information/Address/${index}/${fieldKey}/value`;
                                                oModel.setProperty(path, value);
                                            }.bind(this)
                                        });
                                        break;

                                    case "calendar":
                                        oField = new sap.m.DatePicker({
                                            value: field.value,
                                            required: field.mandatory,
                                            visible: field.visible,
                                            placeholder: field.placeholder || "",
                                            valueStateText: field.mandatory ? `${field.label} is required` : "",
                                            change: function (oEvent) {
                                                const value = oEvent.getSource().getValue();
                                                const oModel = this.getView().getModel("formDataModel");
                                                const path = `/Supplier Information/Address/${index}/${fieldKey}/value`;
                                                oModel.setProperty(path, value);
                                            }.bind(this)
                                        });
                                        break;

                                    case "text":
                                    default:
                                        oField = new Input({
                                            value: field.value,
                                            type: field.label.toLowerCase().includes("email") ? "Email" :
                                                field.label.toLowerCase().includes("contact") ? "Tel" : "Text",
                                            required: field.mandatory,
                                            visible: field.visible,
                                            valueState: "None",
                                            minLength: field.minimum ? parseInt(field.minimum) : undefined,
                                            maxLength: field.maximum ? parseInt(field.maximum) : undefined,
                                            placeholder: field.placeholder || "",
                                            valueStateText: field.mandatory ? `${field.label} is required` : "",
                                            change: function (oEvent) {
                                                const value = oEvent.getSource().getValue();
                                                const oModel = this.getView().getModel("formDataModel");
                                                const path = `/Supplier Information/Address/${index}/${fieldKey}/value`;
                                                oModel.setProperty(path, value);
                                            }.bind(this)
                                        });
                                        break;
                                }

                                oForm.addContent(oLabel);
                                oForm.addContent(oField);
                            }.bind(this));

                            oVBox.addItem(oTitleBar);
                            oVBox.addItem(oForm);
                            oContainer.addContent(oVBox);
                        }.bind(this));
                    } else {
                        const oVBox = new VBox({ class: "sapUiSmallMarginBottom" });

                        const oTitleBar = new Toolbar({
                            content: [
                                new Title({ text: sectionName, level: "H3" })
                            ]
                        });

                        const oForm = new SimpleForm({
                            editable: true,
                            layout: "ColumnLayout",
                            labelSpanXL: 3,
                            labelSpanL: 3,
                            labelSpanM: 4,
                            labelSpanS: 12,
                            adjustLabelSpan: false,
                            columnsXL: 2,
                            columnsL: 2,
                            columnsM: 1,
                            singleContainerFullSize: false
                        });

                        Object.keys(sectionData).forEach(function (fieldKey) {
                            const field = sectionData[fieldKey];
                            if (!field.visible) return;

                            const oLabel = new Label({ text: field.label, required: field.mandatory });
                            let oField;

                            switch (field.type.toLowerCase()) {
                                case "f4help":
                                    let valueHelpHandler;
                                    if (fieldKey === "VENDOR_TYPE" || field.label.toLowerCase().includes("vendor type")) {
                                        valueHelpHandler = function (oEvent) {
                                            console.log("VENDOR_TYPE value help triggered:", { sectionName, fieldKey });
                                            this.onValueHelpVendorFrag(oEvent.getSource(), sectionName, fieldKey);
                                        }.bind(this);
                                    } else if (fieldKey === "VENDOR_SUB_TYPE" || field.label.toLowerCase().includes("vendor sub type")) {
                                        valueHelpHandler = function (oEvent) {
                                            console.log("VENDOR_SUB_TYPE value help triggered:", { sectionName, fieldKey });
                                            this.onValueHelpSubVendorFrag
                                                ? this.onValueHelpSubVendorFrag(oEvent.getSource(), sectionName, fieldKey)
                                                : console.log("onValueHelpSubVendorFrag not implemented");
                                        }.bind(this);
                                    } else {
                                        valueHelpHandler = function () {
                                            console.log(`No value help handler defined for ${fieldKey}`);
                                        }.bind(this);
                                    }

                                    const inputProps = {
                                        value: `{formDataModel>/Supplier Information/${sectionName}/${fieldKey}/value}`,
                                        // id: this.createId(`input_${this._sanitizeId(sectionName)}_${fieldKey}`),
                                        showValueHelp: true,
                                        valueHelpRequest: valueHelpHandler,
                                        change: function (oEvent) {
                                            const value = oEvent.getSource().getValue();
                                            const oModel = this.getView().getModel("formDataModel");
                                            if (oModel) {
                                                oModel.getData()["Supplier Information"][sectionName][fieldKey].value = value;
                                                oModel.refresh();
                                            } else {
                                                console.warn("formDataModel not found.");
                                            }
                                        }.bind(this)
                                    };

                                    if (field.suggestionPath) {
                                        inputProps.suggestionItems = {
                                            path: field.suggestionPath,
                                            template: new sap.ui.core.ListItem({
                                                key: "{SPRAS}",
                                                text: "{SPRAS}",
                                                additionalText: fieldKey === "VENDOR_TYPE" ? "{TXT40}" : "{TXT30}"
                                            })
                                        };
                                    }

                                    if (this.onSuggestionItemSelected) {
                                        inputProps.suggestionItemSelected = this.onSuggestionItemSelected.bind(this);
                                    }

                                    oField = new Input(inputProps);
                                    break;

                                case "dropdown":
                                    const dropdownOptions = field.dropdownValues ? field.dropdownValues.split(",").map(opt => opt.trim()) : ["Option 1", "Option 2"];
                                    const items = [
                                        new sap.ui.core.Item({ key: "", text: field.placeholder || "Select an option" }),
                                        ...dropdownOptions.map(opt => new sap.ui.core.Item({ key: opt, text: opt }))
                                    ];
                                    oField = new sap.m.Select({
                                        required: field.mandatory,
                                        selectedKey: field.defaultValue || field.value || "",
                                        items: items,
                                        change: function (oEvent) {
                                            const selectedKey = oEvent.getSource().getSelectedKey();
                                            const oModel = this.getView().getModel("formDataModel");
                                            const path = `/Supplier Information/${sectionName}/${fieldKey}/value`;
                                            oModel.setProperty(path, selectedKey);
                                        }.bind(this)
                                    });
                                    break;

                                case "checkbox":
                                    oField = new sap.m.CheckBox({
                                        selected: field.value === "true" || field.value === true,
                                        select: function (oEvent) {
                                            const selected = oEvent.getSource().getSelected();
                                            const oModel = this.getView().getModel("formDataModel");
                                            const path = `/Supplier Information/${sectionName}/${fieldKey}/value`;
                                            oModel.setProperty(path, selected);
                                        }.bind(this)
                                    });
                                    break;

                                case "radio":
                                    oField = new RadioButtonGroup({
                                        selectedIndex: field.value === "Yes" ? 0 : field.value === "No" ? 1 : -1,
                                        buttons: [
                                            new RadioButton({ text: "Yes" }),
                                            new RadioButton({ text: "No" })
                                        ],
                                        select: function (oEvent) {
                                            const selectedIndex = oEvent.getSource().getSelectedIndex();
                                            const value = selectedIndex === 0 ? "Yes" : "No";
                                            const oModel = this.getView().getModel("formDataModel");
                                            const path = `/Supplier Information/${sectionName}/${fieldKey}/value`;
                                            oModel.setProperty(path, value);
                                        }.bind(this)
                                    });
                                    break;

                                case "number":
                                    oField = new Input({
                                        value: field.value,
                                        type: "Number",
                                        required: field.mandatory,
                                        visible: field.visible,
                                        min: field.minimum ? parseFloat(field.minimum) : undefined,
                                        max: field.maximum ? parseFloat(field.maximum) : undefined,
                                        placeholder: field.placeholder || "",
                                        valueStateText: field.mandatory ? `${field.label} is required` : "",
                                        change: function (oEvent) {
                                            const value = oEvent.getSource().getValue();
                                            const oModel = this.getView().getModel("formDataModel");
                                            const path = `/Supplier Information/${sectionName}/${fieldKey}/value`;
                                            oModel.setProperty(path, value);
                                        }.bind(this)
                                    });
                                    break;

                                case "calendar":
                                    oField = new sap.m.DatePicker({
                                        value: field.value,
                                        required: field.mandatory,
                                        visible: field.visible,
                                        placeholder: field.placeholder || "",
                                        valueStateText: field.mandatory ? `${field.label} is required` : "",
                                        change: function (oEvent) {
                                            const value = oEvent.getSource().getValue();
                                            const oModel = this.getView().getModel("formDataModel");
                                            const path = `/Supplier Information/${sectionName}/${fieldKey}/value`;
                                            oModel.setProperty(path, value);
                                        }.bind(this)
                                    });
                                    break;

                                case "text":
                                default:
                                    oField = new Input({
                                        value: field.value,
                                        type: field.label.toLowerCase().includes("email") ? "Email" :
                                            field.label.toLowerCase().includes("contact") ? "Tel" : "Text",
                                        required: field.mandatory,
                                        visible: field.visible,
                                        valueState: "None",
                                        minLength: field.minimum ? parseInt(field.minimum) : undefined,
                                        maxLength: field.maximum ? parseInt(field.maximum) : undefined,
                                        placeholder: field.placeholder || "",
                                        valueStateText: field.mandatory ? `${field.label} is required` : "",
                                        change: function (oEvent) {
                                            const value = oEvent.getSource().getValue();
                                            const oModel = this.getView().getModel("formDataModel");
                                            const path = `/Supplier Information/${sectionName}/${fieldKey}/value`;
                                            oModel.setProperty(path, value);
                                        }.bind(this)
                                    });
                                    break;
                            }

                            oForm.addContent(oLabel);
                            oForm.addContent(oField);
                        }.bind(this));

                        oVBox.addItem(oTitleBar);
                        oVBox.addItem(oForm);
                        oContainer.addContent(oVBox);
                    }
                }.bind(this));
            },

            onValueHelpVendorFrag: function (oInput, sectionName, fieldKey, index) {
                let oView = this.getView();

                // Validate input parameters
                if (!sectionName || !fieldKey) {
                    console.error("Invalid parameters in onValueHelpVendorFrag:", { oInput, sectionName, fieldKey, index });
                    MessageBox.error("Invalid form field configuration. Please contact support.");
                    return;
                }

                // Store context
                this._oInputContext = { sectionName, fieldKey, index };
                console.log("Stored context in onValueHelpVendorFrag:", this._oInputContext);

                if (!this._oValueHelpDialog1) {
                    Fragment.load({
                        id: oView.getId(),
                        name: "com.requestmanagement.requestmanagement.fragments.vendorType",
                        controller: this
                    }).then(function (oDialog) {
                        this._oValueHelpDialog1 = oDialog;
                        oView.addDependent(this._oValueHelpDialog1);

                        // Bind data
                        this._bindVendorTypeData(this._oValueHelpDialog1);

                        // Attach OK event handler
                        this._oValueHelpDialog1.attachOk(function (oEvent) {
                            console.log("OK event triggered in ValueHelpDialog1 with context:", this._oInputContext);
                            if (!this._oInputContext) {
                                console.error("Context is undefined in OK event handler");
                                MessageBox.error("Invalid context. Please contact support.");
                                return;
                            }
                            this.onValueHelpOkPressRolesVendor(oEvent, this._oInputContext);
                        }.bind(this));

                        this._oValueHelpDialog1.open();
                    }.bind(this)).catch(function (oError) {
                        console.error("Failed to load vendorType fragment:", oError);
                        MessageBox.error("Unable to load the vendor type selection. Please try again.");
                    }.bind(this));
                } else {
                    // Reassign context before reopening
                    this._oInputContext = { sectionName, fieldKey, index };
                    console.log("Reusing dialog with context:", this._oInputContext);
                    this._bindVendorTypeData(this._oValueHelpDialog1);
                    this._oValueHelpDialog1.open();
                }
            },

            onValueHelpSubVendorFrag: function (oInput, sectionName, fieldKey, index) {
                let oView = this.getView();

                // Validate input parameters
                if (!sectionName || !fieldKey) {
                    console.error("Invalid parameters in onValueHelpSubVendorFrag:", { oInput, sectionName, fieldKey, index });
                    MessageBox.error("Invalid form field configuration. Please contact support.");
                    return;
                }

                // Store context
                this._oInputContext = { sectionName, fieldKey, index };
                console.log("Stored context in onValueHelpSubVendorFrag:", this._oInputContext);

                if (!this._oValueHelpDialog) {
                    Fragment.load({
                        id: oView.getId(),
                        name: "com.requestmanagement.requestmanagement.fragments.SubvendorType",
                        controller: this
                    }).then(function (oDialog) {
                        this._oValueHelpDialog = oDialog;
                        oView.addDependent(this._oValueHelpDialog);

                        // Bind data
                        this._bindVendorTypeData1(this._oValueHelpDialog);

                        // Attach OK event handler with explicit binding
                        this._oValueHelpDialog.attachOk(function (oEvent) {
                            console.log("OK event triggered in ValueHelpDialog with context:", this._oInputContext);
                            if (!this._oInputContext) {
                                console.error("Context is undefined in OK event handler for SubvendorType");
                                MessageBox.error("Form configuration error. Please contact support.");
                                return;
                            }
                            this.onValueHelpOkPressRoles(oEvent, this._oInputContext);
                        }.bind(this));

                        this._oValueHelpDialog.open();
                    }.bind(this)).catch(function (oError) {
                        console.error("Failed to load SubvendorType fragment:", oError);
                        MessageBox.error("Unable to load the sub-vendor type selection dialog. Please try again.");
                    }.bind(this));
                } else {
                    // Reassign context before reopening
                    this._oInputContext = { sectionName, fieldKey, index };
                    console.log("Reusing SubvendorType dialog with context:", this._oInputContext);
                    this._bindVendorTypeData1(this._oValueHelpDialog);
                    this._oValueHelpDialog.open();
                }
            },

            _bindVendorTypeData: function (oDialog) {
                let oModel = this.getOwnerComponent().getModel();
                oDialog.setModel(oModel);

                oDialog.getTableAsync().then(function (oTable) {
                    oTable.setModel(oModel);

                    if (oTable.bindRows) {
                        oTable.bindAggregation("rows", {
                            path: "/Vendor_Type",
                            events: {
                                dataReceived: function (oEvent) {
                                    if (!oEvent.getParameter("data")) {
                                        MessageBox.warning("No vendor type data available.");
                                    }
                                    oDialog.update();
                                }
                            }
                        });

                        if (oTable.getColumns().length === 0) {
                            oTable.addColumn(new sap.ui.table.Column({
                                label: new Label({ text: "Language (SPRAS)" }),
                                template: new Text({ text: "{SPRAS}" })
                            }));

                            oTable.addColumn(new sap.ui.table.Column({
                                label: new Label({ text: "Description (TXT30)" }),
                                template: new Text({ text: "{TXT30}" })
                            }));
                        }
                    }

                    oDialog.update();
                }.bind(this));
            },

            _bindVendorTypeData1: function (oDialog) {
                let oModel = this.getOwnerComponent().getModel();
                oDialog.setModel(oModel);

                oDialog.getTableAsync().then(function (oTable) {
                    oTable.setModel(oModel);

                    if (oTable.bindRows) {
                        oTable.bindAggregation("rows", {
                            path: "/Vendor_Sub_Type",
                            events: {
                                dataReceived: function (oEvent) {
                                    if (!oEvent.getParameter("data")) {
                                        MessageBox.warning("No sub-vendor type data available.");
                                    }
                                    oDialog.update();
                                }
                            }
                        });

                        if (oTable.getColumns().length === 0) {
                            oTable.addColumn(new sap.ui.table.Column({
                                label: new Label({ text: "Language (SPRAS)" }),
                                template: new Text({ text: "{SPRAS}" })
                            }));

                            oTable.addColumn(new sap.ui.table.Column({
                                label: new Label({ text: "Description (TEXT40)" }),
                                template: new Text({ text: "{TEXT40}" })
                            }));
                        }
                    }

                    oDialog.update();
                }.bind(this));
            },

            onValueHelpOkPressRolesVendor: function (oEvent, oContext) {
                console.log("onValueHelpOkPressRolesVendor called with:", { oEvent, oContext });

                // Validate context
                if (!oContext) {
                    console.error("oContext is undefined in onValueHelpOkPressRolesVendor");
                    // MessageBox.error("Form configuration error. Please contact support.");
                    return;
                }

                const { sectionName, fieldKey, index } = oContext;

                if (!sectionName || !fieldKey) {
                    console.error("Invalid context properties:", { sectionName, fieldKey, index });
                    MessageBox.error("Invalid form field configuration. Please contact support.");
                    return;
                }

                // Get selected tokens
                const aTokens = oEvent.getParameter("tokens");
                if (!aTokens || aTokens.length === 0) {
                    MessageBox.warning("No vendor type selected.");
                    return;
                }

                const oToken = aTokens[0];
                const oSelectedData = oToken.data();

                // Validate selection data
                if (!oSelectedData || !oSelectedData.row || !oSelectedData.row.SPRAS || !oSelectedData.row.TXT30) {
                    console.error("Invalid selection data:", oSelectedData);
                    MessageBox.error("Invalid selection data. Please try again.");
                    return;
                }

                const sSelectedKey = oSelectedData.row.SPRAS;
                const sSelectedText = oSelectedData.row.TXT30; // Use TXT30 instead of TEXT40
                const sDisplayValue = `${sSelectedKey} - ${sSelectedText}`;

                // Update the data model directly
                const oModel = this.getView().getModel("formDataModel");
                if (oModel) {
                    const oData = oModel.getData();
                    if (sectionName === "Address") {
                        if (oData["Supplier Information"] && oData["Supplier Information"]["Address"] &&
                            oData["Supplier Information"]["Address"][index] &&
                            oData["Supplier Information"]["Address"][index][fieldKey]) {
                            oData["Supplier Information"]["Address"][index][fieldKey].value = sDisplayValue;
                            console.log(`Updated model: Supplier Information/Address/${index}/${fieldKey} = ${sDisplayValue}`);
                        } else {
                            console.warn(`Invalid model path for Address: Supplier Information/Address/${index}/${fieldKey}`);
                            MessageBox.error("Unable to update vendor type. Invalid form configuration.");
                        }
                    } else {
                        if (oData["Supplier Information"] && oData["Supplier Information"][sectionName] &&
                            oData["Supplier Information"][sectionName][fieldKey]) {
                            oData["Supplier Information"][sectionName][fieldKey].value = sDisplayValue;
                            console.log(`Updated model: Supplier Information/${sectionName}/${fieldKey} = ${sDisplayValue}`);
                        } else {
                            console.warn(`Invalid model path: Supplier Information/${sectionName}/${fieldKey}`);
                            MessageBox.error("Unable to update vendor type. Invalid form configuration.");
                        }
                    }
                    oModel.refresh(); // Ensure UI updates
                } else {
                    console.warn("formDataModel not found.");
                    MessageBox.error("Data model not found. Please try again.");
                    return;
                }

                // Close the dialog and clear context
                if (this._oValueHelpDialog1) {
                    this._oValueHelpDialog1.close();
                } else {
                    console.warn("Vendor type value help dialog not found.");
                }
                this._oInputContext = null; // Clear context
            },

            onValueHelpOkPressRoles: function (oEvent, oContext) {
                console.log("onValueHelpOkPressRoles called with:", { oEvent, oContext });

                // Validate context
                if (!oContext) {
                    console.error("oContext is undefined in onValueHelpOkPressRoles");
                    // MessageBox.error("Form configuration error. Please contact support.");
                    return;
                }

                const { sectionName, fieldKey, index } = oContext;

                if (!sectionName || !fieldKey) {
                    console.error("Invalid context properties:", { sectionName, fieldKey, index });
                    MessageBox.error("Invalid form field configuration. Please contact support.");
                    return;
                }

                // Get selected tokens
                const aTokens = oEvent.getParameter("tokens");
                if (!aTokens || aTokens.length === 0) {
                    MessageBox.warning("No sub-vendor type selected.");
                    return;
                }

                const oToken = aTokens[0];
                const oSelectedData = oToken.data();

                // Validate selection data
                if (!oSelectedData || !oSelectedData.row || !oSelectedData.row.SPRAS || !oSelectedData.row.TEXT40) {
                    console.error("Invalid selection data in onValueHelpOkPressRoles:", oSelectedData);
                    MessageBox.error("Invalid sub-vendor type selection data. Please try again.");
                    return;
                }

                const sSelectedKey = oSelectedData.row.SPRAS;
                const sSelectedText = oSelectedData.row.TEXT40;
                const sDisplayValue = `${sSelectedKey} - ${sSelectedText}`;

                // Update the data model directly
                const oModel = this.getView().getModel("formDataModel");
                if (oModel) {
                    const oData = oModel.getData();
                    if (sectionName === "Address") {
                        if (oData["Supplier Information"] && oData["Supplier Information"]["Address"] &&
                            oData["Supplier Information"]["Address"][index] &&
                            oData["Supplier Information"]["Address"][index][fieldKey]) {
                            oData["Supplier Information"]["Address"][index][fieldKey].value = sDisplayValue;
                            console.log(`Updated model: Supplier Information/Address/${index}/${fieldKey} = ${sDisplayValue}`);
                        } else {
                            console.warn(`Invalid model path for Address: Supplier Information/Address/${index}/${fieldKey}`);
                            MessageBox.error("Unable to update sub-vendor type. Invalid form configuration.");
                        }
                    } else {
                        if (oData["Supplier Information"] && oData["Supplier Information"][sectionName] &&
                            oData["Supplier Information"][sectionName][fieldKey]) {
                            oData["Supplier Information"][sectionName][fieldKey].value = sDisplayValue;
                            console.log(`Updated model: Supplier Information/${sectionName}/${fieldKey} = ${sDisplayValue}`);
                        } else {
                            console.warn(`Invalid model path: Supplier Information/${sectionName}/${fieldKey}`);
                            MessageBox.error("Unable to update sub-vendor type. Invalid form configuration.");
                        }
                    }
                    oModel.refresh(); // Ensure UI updates
                } else {
                    console.warn("formDataModel not found.");
                    MessageBox.error("Data model not found. Please try again.");
                    return;
                }

                // Close the dialog and clear context
                if (this._oValueHelpDialog) {
                    this._oValueHelpDialog.close();
                } else {
                    console.warn("Sub-vendor type value help dialog not found.");
                }
                this._oInputContext = null; // Clear context
            },

            onValueHelpCancelPress: function () {
                // debugger;
                this._oValueHelpDialog.close();
            },

            onValueHelpCancelPressVendor: function () {
                // debugger;
                this._oValueHelpDialog1.close();
            },

            _sanitizeId: function (sInput) {
                return sInput.replace(/[^a-zA-Z0-9_-]/g, "_");
            },

            onNavigateReqMang: function () {
                history.go(-1)
            },

            onExit: function () {
                if (this._oValueHelpDialog1) {
                    this._oValueHelpDialog1.destroy();
                    this._oValueHelpDialog1 = null;
                }
                if (this._oValueHelpDialog) {
                    this._oValueHelpDialog.destroy();
                    this._oValueHelpDialog = null;
                }
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

                                switch (field.type.toLowerCase()) {
                                    case "dropdown":
                                        if (fieldKey === "BANK_COUNTRY" || fieldKey === "BANK_COUNTRY") {
                                            const items = field.dropdownValues ?
                                                [
                                                    new sap.ui.core.Item({ key: "", text: field.placeholder || "Select an option" }),
                                                    ...field.dropdownValues.split(",").map(opt => new sap.ui.core.Item({ key: opt.trim(), text: opt.trim() }))
                                                ] : [
                                                    new sap.ui.core.Item({ key: "", text: field.placeholder || "Select an option" }),
                                                    new sap.ui.core.ListItem({ text: "India", key: "IN" }),
                                                    new sap.ui.core.ListItem({ text: "USA", key: "US" }),
                                                    new sap.ui.core.ListItem({ text: "UK", key: "GB" })
                                                ].concat(fieldKey === "BANK_CURRENCY" ? [
                                                    new sap.ui.core.ListItem({ text: "INR", key: "INR" }),
                                                    new sap.ui.core.ListItem({ text: "USD", key: "USD" }),
                                                    new sap.ui.core.ListItem({ text: "GBP", key: "GBP" })
                                                ] : []);
                                            oControl = new ComboBox({
                                                required: field.mandatory,
                                                visible: field.visible,
                                                selectedKey: field.defaultValue || field.value || "",
                                                items: items,
                                                change: function (oEvent) {
                                                    const selectedKey = oEvent.getSource().getSelectedKey();
                                                    const oModel = this.getView().getModel("formDataModel");
                                                    const path = `/Finance Information/Primary Bank details/${index}/${fieldKey}/value`;
                                                    oModel.setProperty(path, selectedKey);
                                                }.bind(this)
                                            });
                                        } else {
                                            const dropdownOptions = field.dropdownValues ? field.dropdownValues.split(",").map(opt => opt.trim()) : ["Option 1", "Option 2"];
                                            oControl = new sap.m.Select({
                                                required: field.mandatory,
                                                visible: field.visible,
                                                selectedKey: field.defaultValue || field.value || "",
                                                items: [
                                                    new sap.ui.core.Item({ key: "", text: field.placeholder || "Select an option" }),
                                                    ...dropdownOptions.map(opt => new sap.ui.core.Item({ key: opt, text: opt }))
                                                ],
                                                change: function (oEvent) {
                                                    const selectedKey = oEvent.getSource().getSelectedKey();
                                                    const oModel = this.getView().getModel("formDataModel");
                                                    const path = `/Finance Information/Primary Bank details/${index}/${fieldKey}/value`;
                                                    oModel.setProperty(path, selectedKey);
                                                }.bind(this)
                                            });
                                        }
                                        break;

                                    case "checkbox":
                                        oControl = new sap.m.CheckBox({
                                            selected: field.value === "true" || field.value === true,
                                            visible: field.visible,
                                            select: function (oEvent) {
                                                const selected = oEvent.getSource().getSelected();
                                                const oModel = this.getView().getModel("formDataModel");
                                                const path = `/Finance Information/Primary Bank details/${index}/${fieldKey}/value`;
                                                oModel.setProperty(path, selected);
                                            }.bind(this)
                                        });
                                        break;

                                    case "radio":
                                        oControl = new RadioButtonGroup({
                                            selectedIndex: field.value === "Yes" ? 0 : field.value === "No" ? 1 : -1,
                                            visible: field.visible,
                                            buttons: [
                                                new RadioButton({ text: "Yes" }),
                                                new RadioButton({ text: "No" })
                                            ],
                                            select: function (oEvent) {
                                                const selectedIndex = oEvent.getSource().getSelectedIndex();
                                                const value = selectedIndex === 0 ? "Yes" : "No";
                                                const oModel = this.getView().getModel("formDataModel");
                                                const path = `/Finance Information/Primary Bank details/${index}/${fieldKey}/value`;
                                                oModel.setProperty(path, value);
                                            }.bind(this)
                                        });
                                        break;

                                    case "number":
                                        oControl = new Input({
                                            value: field.value,
                                            type: "Number",
                                            required: field.mandatory,
                                            visible: field.visible,
                                            min: field.minimum ? parseFloat(field.minimum) : undefined,
                                            max: field.maximum ? parseFloat(field.maximum) : undefined,
                                            placeholder: field.placeholder || "",
                                            valueStateText: field.mandatory ? `${field.label} is required` : "",
                                            change: function (oEvent) {
                                                const value = oEvent.getSource().getValue();
                                                const oModel = this.getView().getModel("formDataModel");
                                                const path = `/Finance Information/Primary Bank details/${index}/${fieldKey}/value`;
                                                oModel.setProperty(path, value);
                                            }.bind(this)
                                        });
                                        break;

                                    case "calendar":
                                        oControl = new sap.m.DatePicker({
                                            value: field.value,
                                            required: field.mandatory,
                                            visible: field.visible,
                                            placeholder: field.placeholder || "",
                                            valueStateText: field.mandatory ? `${field.label} is required` : "",
                                            change: function (oEvent) {
                                                const value = oEvent.getSource().getValue();
                                                const oModel = this.getView().getModel("formDataModel");
                                                const path = `/Finance Information/Primary Bank details/${index}/${fieldKey}/value`;
                                                oModel.setProperty(path, value);
                                            }.bind(this)
                                        });
                                        break;

                                    case "text":
                                    default:
                                        oControl = new Input({
                                            value: field.value,
                                            type: field.label.toLowerCase().includes("email") ? "Email" :
                                                field.label.toLowerCase().includes("contact") ? "Tel" : "Text",
                                            required: field.mandatory,
                                            visible: field.visible,
                                            valueState: "None",
                                            minLength: field.minimum ? parseInt(field.minimum) : undefined,
                                            maxLength: field.maximum ? parseInt(field.maximum) : undefined,
                                            placeholder: field.placeholder || "",
                                            valueStateText: field.mandatory ? `${field.label} is required` : "",
                                            change: function (oEvent) {
                                                debugger;
                                                const value = oEvent.getSource().getValue();
                                                const oModel = this.getView().getModel("formDataModel");
                                                const path = `/Finance Information/Primary Bank details/${index}/${fieldKey}/value`;
                                                oModel.setProperty(path, value);
                                            }.bind(this)
                                        });
                                        break;
                                }

                                oForm.addContent(oLabel);
                                oForm.addContent(oControl);
                                console.log(`Added field: ${field.label} in ${bankType}`);
                            }
                        }.bind(this));

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

                            switch (field.type.toLowerCase()) {
                                case "dropdown":
                                    const dropdownOptions = field.dropdownValues ? field.dropdownValues.split(",").map(opt => opt.trim()) : ["Option 1", "Option 2"];
                                    oControl = new sap.m.Select({
                                        required: field.mandatory,
                                        visible: field.visible,
                                        selectedKey: field.defaultValue || field.value || "",
                                        items: [
                                            new sap.ui.core.Item({ key: "", text: field.placeholder || "Select an option" }),
                                            ...dropdownOptions.map(opt => new sap.ui.core.Item({ key: opt, text: opt }))
                                        ],
                                        change: function (oEvent) {
                                            const selectedKey = oEvent.getSource().getSelectedKey();
                                            const oModel = this.getView().getModel("formDataModel");
                                            const path = `formDataModel>/Finance Information/TAX-VAT-GST/${fieldKey}/value`;
                                            oModel.setProperty(path, selectedKey);
                                        }.bind(this)
                                    });
                                    break;

                                case "checkbox":
                                    oControl = new sap.m.CheckBox({
                                        selected: field.value === "true" || field.value === true,
                                        visible: field.visible,
                                        select: function (oEvent) {
                                            const selected = oEvent.getSource().getSelected();
                                            const oModel = this.getView().getModel("formDataModel");
                                            const path = `/Finance Information/TAX-VAT-GST/${fieldKey}/value`;
                                            oModel.setProperty(path, selected);
                                        }.bind(this)
                                    });
                                    break;

                                case "radio":
                                    oControl = new RadioButtonGroup({
                                        selectedIndex: field.value === "Yes" ? 0 : field.value === "No" ? 1 : -1,
                                        visible: field.visible,
                                        columns: 2, // Set to 2 for horizontal arrangement
                                        buttons: [
                                            new RadioButton({ text: "Yes" }),
                                            new RadioButton({ text: "No" })
                                        ],
                                        select: function (oEvent) {
                                            const selectedIndex = oEvent.getSource().getSelectedIndex();
                                            const value = selectedIndex === 0 ? "Yes" : "No";
                                            const oModel = this.getView().getModel("formDataModel");
                                            const path = `/Finance Information/TAX-VAT-GST/${fieldKey}/value`;
                                            oModel.setProperty(path, value);
                                        }.bind(this)
                                    });
                                    break;

                                case "number":
                                    oControl = new Input({
                                        value: field.value,
                                        type: "Number",
                                        required: field.mandatory,
                                        visible: field.visible,
                                        min: field.minimum ? parseFloat(field.minimum) : undefined,
                                        max: field.maximum ? parseFloat(field.maximum) : undefined,
                                        placeholder: field.placeholder || "",
                                        valueStateText: field.mandatory ? `${field.label} is required` : "",
                                        change: function (oEvent) {
                                            const value = oEvent.getSource().getValue();
                                            const oModel = this.getView().getModel("formDataModel");
                                            const path = `/Finance Information/TAX-VAT-GST/${fieldKey}/value`;
                                            oModel.setProperty(path, value);
                                        }.bind(this)
                                    });
                                    break;

                                case "calendar":
                                    oControl = new sap.m.DatePicker({
                                        value: field.value,
                                        required: field.mandatory,
                                        visible: field.visible,
                                        placeholder: field.placeholder || "",
                                        valueStateText: field.mandatory ? `${field.label} is required` : "",
                                        change: function (oEvent) {
                                            const value = oEvent.getSource().getValue();
                                            const oModel = this.getView().getModel("formDataModel");
                                            const path = `/Finance Information/TAX-VAT-GST/${fieldKey}/value`;
                                            oModel.setProperty(path, value);
                                        }.bind(this)
                                    });
                                    break;

                                case "text":
                                default:
                                    oControl = new Input({
                                        value: field.value,
                                        type: field.label.toLowerCase().includes("email") ? "Email" :
                                        field.label.toLowerCase().includes("contact") ? "Tel" : "Text",
                                        required: field.mandatory,
                                        visible: field.visible,
                                        valueState: "None",
                                        minLength: field.minimum ? parseInt(field.minimum) : undefined,
                                        maxLength: field.maximum ? parseInt(field.maximum) : undefined,
                                        placeholder: field.placeholder || "",
                                        valueStateText: field.mandatory ? `${field.label} is required` : "",
                                        change: function (oEvent) {
                                            const value = oEvent.getSource().getValue();
                                            const oModel = this.getView().getModel("formDataModel");
                                            const path = `/Finance Information/TAX-VAT-GST/${fieldKey}/value`;
                                            oModel.setProperty(path, value);
                                        }.bind(this)
                                    });
                                    break;
                            }

                            oTaxForm.addContent(oLabel);
                            oTaxForm.addContent(oControl);
                            console.log(`Added field: ${field.label} in TAX-VAT-GST`);
                        }
                    }.bind(this));

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

                            switch (field.type.toLowerCase()) {
                                case "dropdown":
                                    if (fieldKey === "PRODUCT_CATEGORY") {
                                        const items = field.dropdownValues ?
                                            [
                                                new sap.ui.core.Item({ key: "", text: field.placeholder || "Select an option" }),
                                                ...field.dropdownValues.split(",").map(opt => new sap.ui.core.Item({ key: opt.trim(), text: opt.trim() }))
                                            ] : [
                                                new sap.ui.core.Item({ key: "", text: field.placeholder || "Select an option" }),
                                                new sap.ui.core.ListItem({ text: "Electrical Equipment", key: "EE" }),
                                                new sap.ui.core.ListItem({ text: "Mechanical Parts", key: "MP" }),
                                                new sap.ui.core.ListItem({ text: "Raw Materials", key: "RM" })
                                            ];
                                        oControl = new ComboBox({
                                            required: field.mandatory,
                                            visible: field.visible,
                                            selectedKey: field.defaultValue || field.value || "",
                                            items: items,
                                            change: function (oEvent) {
                                                const selectedKey = oEvent.getSource().getSelectedKey();
                                                const oModel = this.getView().getModel("formDataModel");
                                                const path = `/Operational Information/${categoryName}/${fieldKey}/value`;
                                                oModel.setProperty(path, selectedKey);
                                            }.bind(this)
                                        });
                                    } else {
                                        const dropdownOptions = field.dropdownValues ? field.dropdownValues.split(",").map(opt => opt.trim()) : ["Option 1", "Option 2"];
                                        oControl = new sap.m.Select({
                                            required: field.mandatory,
                                            visible: field.visible,
                                            selectedKey: field.defaultValue || field.value || "",
                                            items: [
                                                new sap.ui.core.Item({ key: "", text: field.placeholder || "Select an option" }),
                                                ...dropdownOptions.map(opt => new sap.ui.core.Item({ key: opt, text: opt }))
                                            ],
                                            change: function (oEvent) {
                                                const selectedKey = oEvent.getSource().getSelectedKey();
                                                const oModel = this.getView().getModel("formDataModel");
                                                const path = `/Operational Information/${categoryName}/${fieldKey}/value`;
                                                oModel.setProperty(path, selectedKey);
                                            }.bind(this)
                                        });
                                    }
                                    break;

                                case "checkbox":
                                    oControl = new sap.m.CheckBox({
                                        selected: field.value === "true" || field.value === true,
                                        visible: true,
                                        select: function (oEvent) {
                                            const selected = oEvent.getSource().getSelected();
                                            const oModel = this.getView().getModel("formDataModel");
                                            const path = `/Operational Information/${categoryName}/${fieldKey}/value`;
                                            oModel.setProperty(path, selected);
                                        }.bind(this)
                                    });
                                    break;

                                case "radio":
                                    oControl = new RadioButtonGroup({
                                        selectedIndex: field.value === "Yes" ? 0 : field.value === "No" ? 1 : -1,
                                        visible: true,
                                        columns: 2, // Horizontal arrangement
                                        buttons: [
                                            new RadioButton({ text: "Yes" }),
                                            new RadioButton({ text: "No" })
                                        ],
                                        select: function (oEvent) {
                                            const selectedIndex = oEvent.getSource().getSelectedIndex();
                                            const value = selectedIndex === 0 ? "Yes" : "No";
                                            const oModel = this.getView().getModel("formDataModel");
                                            const path = `/Operational Information/${categoryName}/${fieldKey}/value`;
                                            oModel.setProperty(path, value);
                                        }.bind(this)
                                    });
                                    break;

                                case "number":
                                    oControl = new Input({
                                        value: field.value,
                                        type: "Number",
                                        required: field.mandatory,
                                        visible: field.visible,
                                        min: field.minimum ? parseFloat(field.minimum) : undefined,
                                        max: field.maximum ? parseFloat(field.maximum) : undefined,
                                        placeholder: field.placeholder || "",
                                        valueStateText: field.mandatory ? `${field.label} is required` : "",
                                        change: function (oEvent) {
                                            const value = oEvent.getSource().getValue();
                                            const oModel = this.getView().getModel("formDataModel");
                                            const path = `/Operational Information/${categoryName}/${fieldKey}/value`;
                                            oModel.setProperty(path, value);
                                        }.bind(this)
                                    });
                                    break;

                                case "calendar":
                                    oControl = new sap.m.DatePicker({
                                        value: field.value,
                                        required: field.mandatory,
                                        visible: field.visible,
                                        placeholder: field.placeholder || "",
                                        valueStateText: field.mandatory ? `${field.label} is required` : "",
                                        change: function (oEvent) {
                                            const value = oEvent.getSource().getValue();
                                            const oModel = this.getView().getModel("formDataModel");
                                            const path = `/Operational Information/${categoryName}/${fieldKey}/value`;
                                            oModel.setProperty(path, value);
                                        }.bind(this)
                                    });
                                    break;

                                case "text":
                                default:
                                    oControl = new Input({
                                        value: field.value,
                                        type: field.label.toLowerCase().includes("email") ? "Email" :
                                            field.label.toLowerCase().includes("contact") ? "Tel" : "Text",
                                        required: field.mandatory,
                                        visible: field.visible,
                                        minLength: field.minimum ? parseInt(field.minimum) : undefined,
                                        maxLength: field.maximum ? parseInt(field.maximum) : undefined,
                                        placeholder: field.placeholder || "",
                                        valueStateText: field.mandatory ? `${field.label} is required` : "",
                                        change: function (oEvent) {
                                            const value = oEvent.getSource().getValue();
                                            const oModel = this.getView().getModel("formDataModel");
                                            const path = `/Operational Information/${categoryName}/${fieldKey}/value`;
                                            oModel.setProperty(path, value);
                                        }.bind(this)
                                    });
                                    break;
                            }

                            oForm.addContent(oLabel);
                            oForm.addContent(oControl);
                            console.log(`Added field: ${field.label} in ${categoryName}`);
                        }
                    }.bind(this));

                    oContainer.addContent(oForm);
                    console.log(`Added form for ${categoryName}`);
                }.bind(this));
            },

            createDisclosureForm: function (oDisclosureFields, type) {
                let that = this;
                if (type === "registration" || type === "sendback") {
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
                    var oMainVBox = new VBox({
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
                                var oFieldVBox = new VBox({
                                    fitContainer: true
                                }).addStyleClass("sapUiMediumMarginBottom");

                                // Label
                                var oLabel = new Label({
                                    text: field.label,
                                    required: field.mandatory,
                                    wrapping: true
                                });

                                // Description
                                var oDescription = new Text({
                                    text: field.description || "No description available.",
                                    wrapping: true
                                }).addStyleClass("sapUiSmallMarginBottom");

                                // Radio Button Group
                                var oRadioButtonGroup = new RadioButtonGroup({
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

                                oRadioButtonGroup.addButton(new RadioButton({ text: "Yes" }));
                                oRadioButtonGroup.addButton(new RadioButton({ text: "No" }));
                                oRadioButtonGroup.addButton(new RadioButton({ text: "NA" }));

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
                }
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

                var oMainVBox = new VBox().addStyleClass("subSectionSpacing");
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
                                "com.requestmanagement.requestmanagement.fragments.AddDocumentDialog",
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
                        return item instanceof VBox &&
                            item.getItems()[0] instanceof HBox &&
                            item.getItems()[0].getItems()[0] instanceof Title &&
                            item.getItems()[0].getItems()[0].getText() === sNewTitle;
                    });

                    if (!oExistingVBox) {
                        var oNewTable = new Table({
                            growing: true,
                            columns: [
                                new Column({ header: new Label({ text: "Description" }) }),
                                new Column({ header: new Label({ text: "Upload" }) }),
                                new Column({ header: new Label({ text: "File Name" }) }),
                                new Column({ header: new Label({ text: "Actions" }) })
                            ]
                        });

                        var oFileUploader = new FileUploader({
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

                        var oItemTemplate = new ColumnListItem({
                            cells: [
                                new Input({
                                    value: "{formDataModel>description}",
                                    change: this.onDescriptionChange.bind(this)
                                }),
                                new Button({
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
                                new Text({
                                    text: "{formDataModel>fileName}"
                                }),
                                new HBox({
                                    visible: true,
                                    items: [
                                        new Button({
                                            icon: "sap-icon://image-viewer",
                                            type: "Transparent",
                                            tooltip: "Download",
                                            press: function (oEvent) {
                                                var oContext = oEvent.getSource().getBindingContext("formDataModel");
                                                var sBase64Data = oContext?.getProperty("imageUrl");

                                                if (!sBase64Data || typeof sBase64Data !== "string" || !sBase64Data.startsWith("data:")) {
                                                    sap.m.MessageToast.show("No valid file available to open.");
                                                    return;
                                                }

                                                try {
                                                    // Extract MIME type and Base64 content
                                                    var arr = sBase64Data.split(',');
                                                    var mime = arr[0].match(/:(.*?);/)[1];
                                                    var bstr = atob(arr[1]);
                                                    var n = bstr.length;
                                                    var u8arr = new Uint8Array(n);

                                                    while (n--) {
                                                        u8arr[n] = bstr.charCodeAt(n);
                                                    }

                                                    var blob = new Blob([u8arr], { type: mime });
                                                    var blobUrl = URL.createObjectURL(blob);

                                                    // Open the file in a new tab
                                                    window.open(blobUrl, '_blank');
                                                } catch (err) {
                                                    console.error("Error opening file:", err);
                                                    sap.m.MessageToast.show("Error opening the file. Please try again.");
                                                }
                                            }

                                        }),
                                        new Button({
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
                        var oHeaderHBox = new HBox({
                            items: [
                                new Title({
                                    text: sNewTitle,
                                    level: "H3"
                                }),
                                new Button({
                                    icon: "sap-icon://decline",
                                    type: "Transparent",
                                    tooltip: "Remove Section",
                                    press: this.onRemoveDocumentSection.bind(this, sNewTitle)
                                })
                            ],
                            justifyContent: "SpaceBetween",
                            alignItems: "Center"
                        });

                        var oNewVBox = new VBox({
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
                    MessageBox.confirm(`Are you sure you want to remove the "${sTitle}" section?`, {
                        title: "Confirm Deletion",
                        onClose: function (oAction) {
                            if (oAction === MessageBox.Action.OK) {
                                // Remove from model
                                var oAttachments = oFormDataModel.getProperty("/Attachments");
                                oAttachments = oAttachments.filter(field => field.title !== sTitle);
                                oFormDataModel.setProperty("/Attachments", oAttachments);
                                oFormDataModel.refresh(true);
                                console.log(`Removed attachments with title: ${sTitle}`);

                                // Remove the VBox from UI
                                var oVBoxToRemove = this._oMainVBox.getItems().find(item => {
                                    return item instanceof VBox &&
                                        item.getItems()[0] instanceof HBox &&
                                        item.getItems()[0].getItems()[0] instanceof Title &&
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
                var oAddButton = new Button({
                    text: "Add Other Document",
                    press: this.openDocumentDialog.bind(this)
                });

                // Create the header with the Add button
                var oHeader = new HBox({
                    items: [
                        new Title({ text: "Attachments", level: "H2" }),
                        oAddButton
                    ],
                    justifyContent: "SpaceBetween"
                });

                oMainVBox.addItem(oHeader);

                // Store tables for delayed refresh
                var aTables = [];

                if (bForceRecreate || !this._bAttachmentSectionCreated) {
                    transformedFields.forEach((oField, index) => {
                        var oTable = new Table({
                            growing: true,
                            columns: [
                                new Column({ header: new Label({ text: "Description" }) }),
                                new Column({ header: new Label({ text: "Upload" }) }),
                                new Column({ header: new Label({ text: "File Name" }) }),
                                new Column({ header: new Label({ text: "Actions" }) })
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

                        var oItemTemplate = new ColumnListItem({
                            cells: [
                                new Input({
                                    value: "{formDataModel>description}",
                                    change: this.onDescriptionChange.bind(this)
                                }),
                                new Button({
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
                                new Text({
                                    text: "{formDataModel>fileName}"
                                }),
                                new HBox({
                                    visible: true,
                                    items: [
                                        new Button({
                                            icon: "sap-icon://image-viewer",
                                            type: "Transparent",
                                            tooltip: "View",
                                            press: function (oEvent) {
                                                var oContext = oEvent.getSource().getBindingContext("formDataModel");
                                                var sBase64Data = oContext?.getProperty("imageUrl");

                                                if (!sBase64Data || typeof sBase64Data !== "string" || !sBase64Data.startsWith("data:")) {
                                                    sap.m.MessageToast.show("No valid file available to open.");
                                                    return;
                                                }

                                                try {
                                                    // Extract MIME type and Base64 content
                                                    var arr = sBase64Data.split(',');
                                                    var mime = arr[0].match(/:(.*?);/)[1];
                                                    var bstr = atob(arr[1]);
                                                    var n = bstr.length;
                                                    var u8arr = new Uint8Array(n);

                                                    while (n--) {
                                                        u8arr[n] = bstr.charCodeAt(n);
                                                    }

                                                    var blob = new Blob([u8arr], { type: mime });
                                                    var blobUrl = URL.createObjectURL(blob);

                                                    // Open the file in a new tab
                                                    window.open(blobUrl, '_blank');
                                                } catch (err) {
                                                    console.error("Error opening file:", err);
                                                    sap.m.MessageToast.show("Error opening the file. Please try again.");
                                                }
                                            }


                                        }),
                                        new Button({
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

                        oMainVBox.addItem(new VBox({
                            items: [
                                new Title({
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

                    oContainer.addContent(new VBox({
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
                    return item instanceof VBox &&
                        item.getItems()[0] instanceof Title &&
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
                    width: "100%",
                    headerToolbar: new sap.m.OverflowToolbar({
                        content: [
                            new Title({ text: "Quality Certificates" }),
                            new ToolbarSpacer(),
                            new Button({
                                text: "Add Certificate",
                                press: this._openAddCertificateFragment.bind(this)
                            })
                        ]
                    })
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
                oTable.addColumn(new Column({
                    header: new Label({ text: "" }), // Empty header for remove icon
                    width: "50px"
                }));

                // Iterate over categories (e.g., "Standard Certifications")
                Object.keys(qualityCertificatesData).forEach(function (category) {
                    var categoryData = qualityCertificatesData[category];
                    Object.keys(categoryData).forEach(function (fieldKey) {
                        var field = categoryData[fieldKey];
                        if (field.visible) {
                            var descriptionText = field.label.replace(" - Done By", ""); // Extract certification name
                            var oRow = new ColumnListItem();

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

                            // Remove Icon Cell (only for Custom Certifications)
                            if (category === "Custom Certifications") {
                                oRow.addCell(new Button({
                                    icon: "sap-icon://delete",
                                    type: ButtonType.Transparent,
                                    press: this._onRemoveCertificate.bind(this, category, fieldKey)
                                }));
                            } else {
                                oRow.addCell(new Text({ text: "" })); // Empty cell for non-custom rows
                            }

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

            _openAddCertificateFragment: function () {
                if (!this._oAddCertificateDialog) {
                    this._oAddCertificateDialog = sap.ui.xmlfragment(
                        this.getView().getId(),
                        "com.requestmanagement.requestmanagement.fragments.AddCertificate",
                        this
                    );
                    this.getView().addDependent(this._oAddCertificateDialog);
                }

                // Clear previous input
                sap.ui.getCore().byId(this.getView().createId("certificateNameInput")).setValue("");
                this._oAddCertificateDialog.open();
            },

            _onAddCertificateSubmit: function () {
                var sCertificateName = sap.ui.getCore().byId(this.getView().createId("certificateNameInput")).getValue();
                if (!sCertificateName) {
                    sap.m.MessageToast.show("Please enter a certificate name");
                    return;
                }

                var oTable = this.getView().byId(this.getView().createId("QualityCertificatesFormContainer")).getContent()[0];
                var oModel = this.getView().getModel("formDataModel");
                var sCategory = "Custom Certifications"; // Default category for new certificates
                var sFieldKey = `custom_${Date.now()}`; // Unique key for new certificate

                // Update model with new certificate
                var oData = oModel.getData();
                if (!oData["Quality Certificates"][sCategory]) {
                    oData["Quality Certificates"][sCategory] = {};
                }
                oData["Quality Certificates"][sCategory][sFieldKey] = {
                    label: sCertificateName,
                    isCertified: "No",
                    value: "",
                    visible: true,
                    mandatory: false
                };
                oModel.setData(oData);

                // Add new row to table
                var oRow = new ColumnListItem();
                oRow.addCell(new Text({ text: sCertificateName }));
                oRow.addCell(new ComboBox({
                    selectedKey: "No",
                    items: [
                        new sap.ui.core.ListItem({ key: "Yes", text: "Yes" }),
                        new sap.ui.core.ListItem({ key: "No", text: "No" })
                    ]
                }).bindProperty("selectedKey", {
                    path: `formDataModel>/Quality Certificates/${sCategory}/${sFieldKey}/isCertified`
                }));
                oRow.addCell(new Input({
                    value: "",
                    placeholder: "Enter name"
                }).bindValue({
                    path: `formDataModel>/Quality Certificates/${sCategory}/${sFieldKey}/value`
                }));
                oRow.addCell(new Button({
                    icon: "sap-icon://delete",
                    type: ButtonType.Transparent,
                    press: this._onRemoveCertificate.bind(this, sCategory, sFieldKey)
                }));

                oTable.addItem(oRow);
                this._oAddCertificateDialog.close();
                sap.m.MessageToast.show("Certificate added successfully");
            },

            _onAddCertificateCancel: function () {
                this._oAddCertificateDialog.close();
            },

            _onRemoveCertificate: function (sCategory, sFieldKey, oEvent) {
                var oTable = this.getView().byId(this.getView().createId("QualityCertificatesFormContainer")).getContent()[0];
                var oModel = this.getView().getModel("formDataModel");

                // Remove from model
                var oData = oModel.getData();
                if (oData["Quality Certificates"][sCategory] && oData["Quality Certificates"][sCategory][sFieldKey]) {
                    delete oData["Quality Certificates"][sCategory][sFieldKey];
                    if (Object.keys(oData["Quality Certificates"][sCategory]).length === 0) {
                        delete oData["Quality Certificates"][sCategory];
                    }
                    oModel.setData(oData);
                }

                // Remove row from table
                var oRow = oEvent.getSource().getParent();
                oTable.removeItem(oRow);
                oRow.destroy();
                sap.m.MessageToast.show("Certificate removed successfully");
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
                MessageBox.error("The file type *." + oEvent.getParameter("fileType") +
                    " is not supported. Please upload only *." + aFileTypes + " files.");
            },
          
            buildPayload: function (actionType) {
                var oFormData = this.getView().getModel("formDataModel").getData();
                var oDisclosureModel = this.getView().getModel("disclosureModel").getData();
                const currentType = this.currentType;
                
                // Debug formDataModel
                console.log("formDataModel:", JSON.stringify(oFormData, null, 2));
                
                // Function to collect dynamic fields from a category
                const collectDynamicFieldsFromCategory = (categoryData, dynamicFields) => {
                    Object.keys(categoryData).forEach(fieldKey => {
                        const field = categoryData[fieldKey];
                        if (field && typeof field === "object" && (field.newDynamicFormField === true || field.newDynamicFormField === "yes")) {
                            dynamicFields[fieldKey] = field.value || "";
                            console.log(`Collected dynamic field: ${fieldKey} = ${field.value}`, field);
                        }
                    });
                };
                
                // Collect dynamic fields by section and category
                const dynamicFormFields = [];
                
                // Iterate through sections
                Object.keys(oFormData).forEach(sectionName => {
                    const sectionData = oFormData[sectionName];
                    
                    // Iterate through categories within the section
                    Object.keys(sectionData).forEach(categoryName => {
                        const categoryData = sectionData[categoryName];
                        console.log(`Processing category: ${sectionName}/${categoryName}`);
                        
                        // Handle array-based categories (e.g., Address, Primary Bank details)
                        if (Array.isArray(categoryData)) {
                            categoryData.forEach((item, index) => {
                                const dynamicFields = {};
                                collectDynamicFieldsFromCategory(item, dynamicFields);
                                
                                // Add an entry to dynamicFormFields if there are dynamic fields for this item
                                if (Object.keys(dynamicFields).length > 0) {
                                    let customCategory = categoryName;
                                    if (categoryName === "Address") {
                                        customCategory = index === 0 ? "PrimaryAddress" : (item.ADDRESS_TYPE || "Other");
                                    } else if (categoryName === "Primary Bank details") {
                                        customCategory = index === 0 ? "Primary Bank" : (item.BANK_TYPE || "Other Bank Details");
                                    }
                                    dynamicFormFields.push({
                                        SECTION: sectionName,
                                        CATEGORY: customCategory,
                                        DATA: JSON.stringify(dynamicFields)
                                    });
                                    console.log(`Added dynamic fields for ${sectionName}/${customCategory}`, dynamicFields);
                                }
                            });
                        } else {
                            // Handle non-array categories (e.g., Supplier Information, Product-Service Description)
                            const dynamicFields = {};
                            collectDynamicFieldsFromCategory(categoryData, dynamicFields);
                            
                            // Add an entry to dynamicFormFields if there are dynamic fields for this category
                            if (Object.keys(dynamicFields).length > 0) {
                                dynamicFormFields.push({
                                    SECTION: sectionName,
                                    CATEGORY: categoryName,
                                    DATA: JSON.stringify(dynamicFields)
                                });
                                console.log(`Added dynamic fields for ${sectionName}/${categoryName}`, dynamicFields);
                            }
                        }
                    });
                });
                
                // Debug DynamicFormFields
                console.log("DynamicFormFields:", JSON.stringify(dynamicFormFields, null, 2));
                
                // Debug Disclosure_Fields
                console.log("disclosureModel:", JSON.stringify(oDisclosureModel, null, 2));
                
                var payload = {
                    action: actionType,
                    stepNo: 1,
                    reqHeader: [{
                        REGISTERED_ID: oFormData["Supplier Information"]["Supplier Information"]["REGISTERED_ID"]?.value || "",
                        WEBSITE: oFormData["Supplier Information"]["Supplier Information"]["WEBSITE"]?.value || "",
                        VENDOR_NAME1: oFormData["Supplier Information"]["Supplier Information"]["VENDOR_NAME1"]?.value || "",
                        COMPANY_CODE: oFormData["Supplier Information"]["Supplier Information"]["COMPANY_CODE"]?.value || "",
                        SUPPL_TYPE: oFormData["Supplier Information"]["Supplier Information"]["VENDOR_TYPE"]?.value?.split("-")[0]?.trim() || "",
                        SUPPL_TYPE_DESC: oFormData["Supplier Information"]["Supplier Information"]["VENDOR_TYPE"]?.value?.split("-")[1]?.trim() || "",
                        BP_TYPE_CODE: oFormData["Supplier Information"]["Supplier Information"]["VENDOR_SUB_TYPE"]?.value?.split("-")[0]?.trim() || "",
                        BP_TYPE_DESC: oFormData["Supplier Information"]["Supplier Information"]["VENDOR_SUB_TYPE"]?.value?.split("-")[1]?.trim() || "",
                        REQUEST_TYPE: this.REQUEST_TYPE
                    }],
                    addressData: oFormData["Supplier Information"]["Address"].map((address, index) => ({
                        SR_NO: index + 1, // Add SR_NO starting from 1
                        STREET: address.HOUSE_NUM1?.value || "",
                        STREET1: address.STREET1?.value || "",
                        STREET2: address.STREET2?.value || "",
                        STREET3: address.STREET3?.value || "",
                        STREET4: address.STREET4?.value || "",
                        COUNTRY: address.COUNTRY?.value || "",
                        STATE: address.STATE?.value || "",
                        ADDRESS_TYPE: address.ADDRESS_TYPE || "",
                        CITY: address.CITY?.value || "",
                        POSTAL_CODE: address.POSTAL_CODE?.value || "",
                        EMAIL: address.EMAIL?.value || "",
                        CONTACT_NO: address.CONTACT_NO?.value || ""
                    })),
                    contactsData: [{
                        FIRST_NAME: oFormData["Supplier Information"]["Primary Contact"]["FIRST_NAME"]?.value?.split(" ")[0] || "",
                        LAST_NAME: oFormData["Supplier Information"]["Primary Contact"]["LAST_NAME"]?.value?.split(" ")[1] || "",
                        CITY: oFormData["Supplier Information"]["Primary Contact"]["CITY"]?.value || "",
                        STATE: oFormData["Supplier Information"]["Primary Contact"]["STATE"]?.value || "",
                        COUNTRY: oFormData["Supplier Information"]["Primary Contact"]["COUNTRY"]?.value || "",
                        POSTAL_CODE: oFormData["Supplier Information"]["Primary Contact"]["POSTAL_CODE"]?.value || "",
                        DESIGNATION: oFormData["Supplier Information"]["Primary Contact"]["DESIGNATION"]?.value || "",
                        EMAIL: oFormData["Supplier Information"]["Primary Contact"]["EMAIL"]?.value || "",
                        CONTACT_NO: oFormData["Supplier Information"]["Primary Contact"]["CONTACT_NUMBER"]?.value || "",
                        MOBILE_NO: oFormData["Supplier Information"]["Primary Contact"]["MOBILE"]?.value || ""
                    }],
                    DyanamicFormFields: dynamicFormFields,
                    bankData: oFormData["Finance Information"]["Primary Bank details"].map((bank, index) => ({
                        SR_NO: index + 1, // Add SR_NO starting from 1
                        BANK_SECTION: bank.BANK_TYPE || "",
                        SWIFT_CODE: bank.SWIFT_CODE?.value || "",
                        BRANCH_NAME: bank.BRANCH_NAME?.value || "",
                        BANK_COUNTRY: bank.BANK_COUNTRY?.value || "",
                        BANK_NAME: bank.BANK_NAME?.value || "",
                        BENEFICIARY: bank.BENEFICIARY?.value || "",
                        ACCOUNT_NO: bank.ACCOUNT_NO?.value || "",
                        ACCOUNT_NAME: bank.ACCOUNT_NAME?.value || "",
                        IBAN_NUMBER: bank.IBAN_NUMBER?.value || "",
                        ROUTING_CODE: bank.ROUTING_CODE?.value || "",
                        BANK_CURRENCY: bank.BANK_CURRENCY?.value || "",
                        GST: oFormData["Finance Information"]["TAX-VAT-GST"].GST_NO?.value || "",
                        GSTYES_NO: oFormData["Finance Information"]["TAX-VAT-GST"]["TAX/VAT/GST"]?.value || ""
                    })),
                    Operational_Prod_Desc: [{
                        PROD_NAME: oFormData["Operational Information"]["Product-Service Description"]["PRODUCT_NAME"]?.value || "",
                        PROD_DESCRIPTION: oFormData["Operational Information"]["Product-Service Description"]["PRODUCT_DESCRIPTION"]?.value || "",
                        PROD_TYPE: oFormData["Operational Information"]["Product-Service Description"]["PRODUCT_TYPE"]?.value || "",
                        PROD_CATEGORY: oFormData["Operational Information"]["Product-Service Description"]["PRODUCT_CATEGORY"]?.value || ""
                    }],
                    Operational_Capacity: [{
                        TOTAL_PROD_CAPACITY: oFormData["Operational Information"]["Operational Capacity"]["PRODUCTION_CAPACITY"]?.value || "",
                        MINIMUM_ORDER_SIZE: oFormData["Operational Information"]["Operational Capacity"]["ORDER_SIZE_MIN"]?.value || "",
                        MAXMIMUM_ORDER_SIZE: oFormData["Operational Information"]["Operational Capacity"]["ORDER_SIZE_MAX"]?.value || "",
                        CITY: oFormData["Operational Information"]["Operational Capacity"]["PRODUCTION_LOCATION"]?.value || ""
                    }],
                    Disclosure_Fields: [{
                        INTEREST_CONFLICT: (function () {
                            var value = oDisclosureModel["conflictofinterest"];
                            return value === 0 ? "YES" : value === 1 ? "NO" : "";
                        })(),
                        ANY_LEGAL_CASES: (function () {
                            var value = oDisclosureModel["legalcasedisclosure"];
                            return value === 0 ? "YES" : value === 1 ? "NO" : "";
                        })(),
                        ABAC_REG: (function () {
                            var value = oDisclosureModel["anticorruptionantibriberyregulation"];
                            return value === 0 ? "YES" : value === 1 ? "NO" : "";
                        })(),
                        CONTROL_REGULATION: (function () {
                            var value = oDisclosureModel["indianexportcontrol"];
                            return value === 0 ? "YES" : value === 1 ? "NO" : "";
                        })()
                    }],
                    Quality_Certificates: Object.keys(oFormData["Quality Certificates"]["Standard Certifications"])
                        .filter(key => key.endsWith("_DONE_BY"))
                        .map(key => {
                            const certName = key.replace("_DONE_BY", "").replace(/_/g, " ");
                            return {
                                CERTI_NAME: certName,
                                CERTI_TYPE: certName.split(" ")[0] || "",
                                AVAILABLE: oFormData["Quality Certificates"]["Standard Certifications"][key].value ? "YES" : "NO",
                                DONE_BY: oFormData["Quality Certificates"]["Standard Certifications"][key].value || ""
                            };
                        }),
                    Attachments: oFormData["Attachments"].map(attachment => {
                        const url = attachment.imageUrl || "";
                        const isBase64 = url.startsWith("data:");
                        return {
                            REGESTERED_MAIL: oFormData["Supplier Information"]["Supplier Information"]["REGISTERED_ID"]?.value || "",
                            DESCRIPTION: attachment.description || "",
                            ATTACH_SHORT_DEC: attachment.title || "",
                            IMAGEURL: isBase64 ? url.split(",")[1] || "" : url,
                            IMAGE_FILE_NAME: attachment.fileName || ""
                        };
                    })
                };
                
                console.log("Final Payload:", JSON.stringify(payload, null, 2));
                return payload;
            },

            onDraftSave: function () {
                var oPayload = this.buildPayload("DRAFT_SAVE");
                let status = this.responseData?.STATUS;

                if (status === 1) {
                    oPayload.reqHeader[0].REQUEST_NO = parseInt(this.REQUEST_NO, 10);  // Ensure REQUEST_NO is an integer
                }

                var oModel = this.getView().getModel("regModel");
                this.getView().setBusy(true);

                oModel.create("/PostRegData", oPayload, {
                    success: function (oData, oResponse) {
                        console.log("Draft saved successfully:", oData);
                        this.getView().setBusy(false);
                        sap.m.MessageToast.show("Draft saved successfully!");
                    }.bind(this),
                    error: function (oError) {
                        console.error("Error saving draft:", oError);
                        this.getView().setBusy(false);

                        var sMessage = "Failed to save the draft.";
                        if (oError.responseText) {
                            try {
                                var oErrorResponse = JSON.parse(oError.responseText);
                                sMessage = oErrorResponse.error.message.value || sMessage;
                            } catch (e) {
                                sMessage = oError.responseText;
                            }
                        }

                        sap.m.MessageToast.show(sMessage);
                    }.bind(this)
                });
            },

            submitForm: function () {
                let status = this.responseData?.STATUS;
                let actionType;
                if (status === 1) {
                    actionType = "CREATE";
                } else {
                    actionType = this.currentType === "sendback" ? "EDIT_RESUBMIT" : "CREATE";
                }
                var oPayload = this.buildPayload(actionType);
                this.getView().setBusy(true)
                debugger;
                var oModel = this.getView().getModel("regModel"); // OData model ("admin")
                var bValid = this.validateForm(oPayload);
                if (!bValid) {
                    MessageBox.error("Please fill all mandatory fields before submitting.");
                    this.getView().setBusy(false)
                    return;
                }else{
                    console.log("validate sucess")
                }
      
                oModel.create("/PostRegData", oPayload, {
                    success: function (oData, oResponse) {
                        console.log("Form submitted successfully:", oData, oResponse);
                        this.getView().setBusy(false)
                        MessageBox.success("Form submitted successfully!", {
                            onClose: function () {
                                this.getOwnerComponent().getRouter().navTo("RouteRequestManagement");
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
                MessageBox.confirm("You haven’t saved your draft yet. Going back now will discard all entered data. Are you sure you want to continue?", {
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            this.getOwnerComponent().getRouter().navTo("RouteRequestManagement");
                        }
                    }.bind(this)
                });
            },

            validateForm: function (oPayload) {
                var oFormData = this.getView().getModel("formDataModel").getData();
                var oModel = this.getView().getModel("formDataModel");
                var bValid = true;
                var aErrors = [];
            
                // Helper function to validate a field and set error state
                function validateField(value, fieldName, isMandatory, model, modelPath) {
                    if (isMandatory && (value === undefined || value === null || value === "")) {
                        aErrors.push(`Mandatory field '${fieldName}' is missing or empty.`);
                        model.setProperty(`${modelPath}/valueState`, "Error");
                        model.setProperty(`${modelPath}/valueStateText`, `${fieldName} is required.`);
                        console.log(`Set ${modelPath}/valueState=Error, valueStateText=${fieldName} is required.`);
                        return false;
                    } else {
                        model.setProperty(`${modelPath}/valueState`, "None");
                        model.setProperty(`${modelPath}/valueStateText`, "");
                        console.log(`Set ${modelPath}/valueState=None, valueStateText=''`);
                        return true;
                    }
                }
            
                // Validate reqHeader
                if (oPayload.reqHeader && Array.isArray(oPayload.reqHeader)) {
                    oPayload.reqHeader.forEach(function (header, index) {
                        var headerFields = [
                            { key: "REGISTERED_ID", mandatory: true },
                            { key: "VENDOR_NAME1", mandatory: true },
                            { key: "COMPANY_CODE", mandatory: true },
                            { key: "SUPPL_TYPE", mandatory: true },
                            { key: "BP_TYPE_CODE", mandatory: true }
                        ];
                        headerFields.forEach(function (field) {
                            var fieldData = oFormData["Supplier Information"]["Supplier Information"][field.key];
                            var isMandatory = fieldData?.mandatory || field.mandatory;
                            if (!validateField(header[field.key], field.key, isMandatory, oModel, `/Supplier Information/Supplier Information/${field.key}`)) {
                                bValid = false;
                            }
                        });
                    });
                } else {
                    aErrors.push("reqHeader is missing or invalid.");
                    bValid = false;
                }
            
                // Validate addressData
                if (oPayload.addressData && Array.isArray(oPayload.addressData) && oPayload.addressData.length > 0) {
                    oPayload.addressData.forEach(function (address, index) {
                        var addressFields = [
                            { key: "STREET", mandatory: false },
                            { key: "STREET1", mandatory: true },
                            { key: "COUNTRY", mandatory: true },
                            { key: "STATE", mandatory: true },
                            { key: "CITY", mandatory: true },
                            { key: "POSTAL_CODE", mandatory: true },
                            { key: "EMAIL", mandatory: true },
                            { key: "CONTACT_NO", mandatory: true },
                            { key: "AddreDrop", mandatory: true, fieldId: "V1R1D073" }
                        ];
                        addressFields.forEach(function (field) {
                            var fieldData = oFormData["Supplier Information"]["Address"][index][field.key];
                            var isMandatory = fieldData?.mandatory || field.mandatory;
                            if (field.fieldId && fieldData?.fieldId !== field.fieldId) {
                                console.warn(`FieldId mismatch for ${field.key}: expected ${field.fieldId}, found ${fieldData?.fieldId}`);
                                return;
                            }
                            var modelPath = `/Supplier Information/Address/${index}/${field.key}`;
                            if (!validateField(address[field.key], fieldData?.label || field.key, isMandatory, oModel, modelPath)) {
                                bValid = false;
                            }
                            // Debug model state after update
                            console.log(`Post-validation state for ${field.key}:`, oModel.getProperty(modelPath));
                        });
                    });
                } else {
                    aErrors.push("At least one address is required.");
                    bValid = false;
                }
            
                // Validate contactsData
                if (oPayload.contactsData && Array.isArray(oPayload.contactsData) && oPayload.contactsData.length > 0) {
                    oPayload.contactsData.forEach(function (contact, index) {
                        var contactFields = [
                            { key: "FIRST_NAME", mandatory: true },
                            { key: "DESIGNATION", mandatory: true },
                            { key: "EMAIL", mandatory: true },
                            { key: "CONTACT_NO", mandatory: true }
                        ];
                        contactFields.forEach(function (field) {
                            var isMandatory = oFormData["Supplier Information"]["Primary Contact"][field.key]?.mandatory || field.mandatory;
                            if (!validateField(contact[field.key], field.key, isMandatory, oModel, `/Supplier Information/Primary Contact/${field.key}`)) {
                                bValid = false;
                            }
                        });
                    });
                } else {
                    aErrors.push("At least one contact is required.");
                    bValid = false;
                }
            
                // Validate bankData
                if (oPayload.bankData && Array.isArray(oPayload.bankData) && oPayload.bankData.length > 0) {
                    oPayload.bankData.forEach(function (bank, index) {
                        var bankFields = [
                            { key: "SWIFT_CODE", mandatory: true },
                            { key: "BRANCH_NAME", mandatory: true },
                            { key: "BANK_COUNTRY", mandatory: true },
                            { key: "BANK_NAME", mandatory: true },
                            { key: "BENEFICIARY", mandatory: true },
                            { key: "ACCOUNT_NO", mandatory: true },
                            { key: "BANK_CURRENCY", mandatory: true },
                            { key: "GST", mandatory: true }
                        ];
                        bankFields.forEach(function (field) {
                            var fieldData = field.key === "GST" ?
                                oFormData["Finance Information"]["TAX-VAT-GST"]["GST_NO"] :
                                oFormData["Finance Information"]["Primary Bank details"][index][field.key];
                            var isMandatory = fieldData?.mandatory || field.mandatory;
                            var modelPath = field.key === "GST" ?
                                `/Finance Information/TAX-VAT-GST/GST_NO` :
                                `/Finance Information/Primary Bank details/${index}/${field.key}`;
                            if (!validateField(bank[field.key], field.key, isMandatory, oModel, modelPath)) {
                                bValid = false;
                            }
                        });
                    });
                } else {
                    aErrors.push("At least one bank detail is required.");
                    bValid = false;
                }
            
                // Validate Operational_Prod_Desc
                if (oPayload.Operational_Prod_Desc && Array.isArray(oPayload.Operational_Prod_Desc) && oPayload.Operational_Prod_Desc.length > 0) {
                    oPayload.Operational_Prod_Desc.forEach(function (product, index) {
                        var productFields = [
                            { key: "PROD_NAME", mandatory: true },
                            { key: "PROD_DESCRIPTION", mandatory: true },
                            { key: "PROD_TYPE", mandatory: true },
                            { key: "PROD_CATEGORY", mandatory: true }
                        ];
                        productFields.forEach(function (field) {
                            var isMandatory = oFormData["Operational Information"]["Product-Service Description"][field.key]?.mandatory || field.mandatory;
                            if (!validateField(product[field.key], field.key, isMandatory, oModel, `/Operational Information/Product-Service Description/${field.key}`)) {
                                bValid = false;
                            }
                        });
                    });
                } else {
                    aErrors.push("Product/Service description is required.");
                    bValid = false;
                }
            
                // Validate Operational_Capacity
                if (oPayload.Operational_Capacity && Array.isArray(oPayload.Operational_Capacity) && oPayload.Operational_Capacity.length > 0) {
                    oPayload.Operational_Capacity.forEach(function (capacity, index) {
                        var capacityFields = [
                            { key: "TOTAL_PROD_CAPACITY", mandatory: true },
                            { key: "MINIMUM_ORDER_SIZE", mandatory: true },
                            { key: "MAXMIMUM_ORDER_SIZE", mandatory: true },
                            { key: "CITY", mandatory: true }
                        ];
                        capacityFields.forEach(function (field) {
                            var isMandatory = oFormData["Operational Information"]["Operational Capacity"][field.key]?.mandatory || field.mandatory;
                            if (!validateField(capacity[field.key], field.key, isMandatory, oModel, `/Operational Information/Operational Capacity/${field.key}`)) {
                                bValid = false;
                            }
                        });
                    });
                } else {
                    aErrors.push("Operational capacity is required.");
                    bValid = false;
                }
            
                // Validate Disclosure_Fields
                if (oPayload.Disclosure_Fields && Array.isArray(oPayload.Disclosure_Fields) && oPayload.Disclosure_Fields.length > 0) {
                    oPayload.Disclosure_Fields.forEach(function (disclosure) {
                        var disclosureFields = [
                            { key: "INTEREST_CONFLICT", mandatory: true },
                            { key: "ANY_LEGAL_CASES", mandatory: true },
                            { key: "ABAC_REG", mandatory: true },
                            { key: "CONTROL_REGULATION", mandatory: true }
                        ];
                        disclosureFields.forEach(function (field) {
                            var isMandatory = oFormData["Disclosures"]?.[field.key.replace(/_/g, ' ')]?.mandatory || field.mandatory;
                            if (!validateField(disclosure[field.key], field.key, isMandatory, oModel, `/Disclosures/${field.key.replace(/_/g, ' ')}`)) {
                                bValid = false;
                            }
                        });
                    });
                } else {
                    aErrors.push("Disclosure fields are required.");
                    bValid = false;
                }
            
                // Validate Quality_Certificates
                if (oPayload.Quality_Certificates && Array.isArray(oPayload.Quality_Certificates)) {
                    oPayload.Quality_Certificates.forEach(function (cert, index) {
                        if (cert.AVAILABLE === "YES") {
                            if (!validateField(cert.DONE_BY, "DONE_BY", true, oModel, `/Quality Certificates/Standard Certifications/${cert.CERTI_NAME.replace(/ /g, '_')}_DONE_BY`)) {
                                bValid = false;
                            }
                        }
                    });
                }
            
                // Validate Attachments
                if (oPayload.Attachments && Array.isArray(oPayload.Attachments)) {
                    oPayload.Attachments.forEach(function (attachment, index) {
                        var attachmentData = oFormData["Attachments"][index];
                        if (attachmentData?.mandatory && !attachment.fileName) {
                            aErrors.push(`Mandatory attachment '${attachment.ATTACH_SHORT_DESC || `Attachment ${index + 1}`}' is missing.`);
                            oModel.setProperty(`/Attachments/${index}/valueState`, "Error");
                            oModel.setProperty(`/Attachments/${index}/valueStateText`, `${attachment.ATTACH_SHORT_DESC || `Attachment ${index + 1}`} is required.`);
                            bValid = false;
                        } else {
                            oModel.setProperty(`/Attachments/${index}/valueState`, "None");
                            oModel.setProperty(`/Attachments/${index}/valueStateText`, "");
                        }
                    });
                }
            
                // Refresh the model to update UI error states
                console.log("Before refresh:", oModel.getProperty("/Supplier Information/Address/0/AddreDrop"));
                oModel.refresh(true);
                console.log("After refresh:", oModel.getProperty("/Supplier Information/Address/0/AddreDrop"));
            
                // Log errors if any
                if (aErrors.length > 0) {
                    console.error("Validation errors:", aErrors);
                }
            
                return bValid;
            },

            rebuildFunction(){
                var oContainer = this.getView().byId("FinanceInformationFormContainer");
                oContainer.removeAllContent();
                

            }

        });
    }
);