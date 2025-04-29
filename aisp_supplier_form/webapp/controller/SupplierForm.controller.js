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
        "sap/ui/unified/FileUploader"

    ],
    function (Controller, MessageBox, JSONModel, SimpleForm, Label, Input, Button, Toolbar, ToolbarSpacer, Title, ComboBox, VBox, RadioButton, RadioButtonGroup, Table, Column, Text, FileUploader) {
        "use strict";

        return Controller.extend("com.aispsuppform.aispsupplierform.controller.SupplierForm", {
            onInit: function () {
                let oModel = this.getOwnerComponent().getModel("admin");
                let mainModel = this.getOwnerComponent().getModel();
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
                    .getRoute("SupplierForm")
                    .attachPatternMatched(this._onRouteMatchedwithoutid, this);

                this.getView().byId("vendorWizard").getSteps()[0].setValidated(true);
            },

            _initializeDisclosureModel: function () {
                var oDisclosureModel = new JSONModel({});
                this.getView().setModel(oDisclosureModel, "disclosureModel");
                console.log("Disclosure model initialized:", oDisclosureModel.getData());
            },

            _onRouteMatchedwithoutid: function (oEvent) {
                var oArguments = oEvent.getParameter("arguments");
                this._EMAIL = oArguments.Email;
                let oModel = this.getView().getModel();
                console.log("Fetching FieldConfig from OData model:", oModel);

                oModel.read("/FieldConfig", {
                    success: function (res) {
                        console.log("FieldConfig response:", res);
                        var fieldConfig = res.results || res.value || res;
                        if (!fieldConfig || (Array.isArray(fieldConfig) && fieldConfig.length === 0)) {
                            console.error("No field configuration data received");
                            MessageBox.error("No field configuration data available.");
                            return;
                        }

                        var formDataModel = this.buildFormDataBySectionCategory(fieldConfig);
                        console.log("Form data model:", formDataModel);

                        var oFormDataModel = new JSONModel(formDataModel);
                        this.getView().setModel(oFormDataModel, "formDataModel");
                        let data = oFormDataModel.getData();
                        this.createDynamicForm(data);
                    }.bind(this),
                    error: function (err) {
                        console.error("Error fetching FieldConfig:", err);
                        MessageBox.error("Failed to load field configuration: " + err.message);
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
                            description: field.FIELD_LABEL,
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

                if (model["Supplier Information"]) {
                    if (model["Supplier Information"]["Supplier Information"]) {
                        model["Supplier Information"]["Supplier Information"]["VENDOR_NAME1"].value = "Tech Innovations Ltd.";
                        model["Supplier Information"]["Supplier Information"]["WEBSITE"].value = "https://techinnovations.com";
                        model["Supplier Information"]["Supplier Information"]["REGISTERED_ID"].value = this._EMAIL;
                        model["Supplier Information"]["Supplier Information"]["Company Code"].value = "1000";
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

            createDisclosureForm: function (oDisclosureFields) {
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



                // Initialize disclosure model with default values (2 = NA)
                var oModel = new sap.ui.model.json.JSONModel({});
                var propertyMap = {}; // Track property names for debugging
                Object.keys(oDisclosureFields).forEach(function (category) {
                    var categoryData = oDisclosureFields[category];
                    Object.keys(categoryData).forEach(function (fieldKey) {
                        var field = categoryData[fieldKey];
                        if (field.visible) {
                            var propertyName = "/" + field.label.toLowerCase().replace(/ /g, '').replace('&', '').replace('-', ''); // Default to NA (2)
                            oModel.setProperty(propertyName, 2); // Default to NA (2)
                            propertyMap[field.label] = propertyName; // Map label to propertyName
                            console.log("Initialized property:", propertyName, "for label:", field.label, "with value:", 2); // Debug initialization
                        }
                    });
                });
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
                                    debugger;
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

            createAttachmentsForm: function (oAttachmentFields) {
                if (!oAttachmentFields || oAttachmentFields.length === 0) {
                    console.error("No fields found for Attachments");
                    return;
                }

                var oContainer = this.getView().byId("AttachmentsFormContainer");
                if (!oContainer) {
                    console.error("AttachmentsFormContainer not found. Check your view XML.");
                    return;
                }

                oContainer.removeAllContent();
                var oMainVBox = new sap.m.VBox().addStyleClass("subSectionSpacing");

                // Use the root formDataModel
                var oFormDataModel = this.getView().getModel("formDataModel");
                if (!oFormDataModel.getProperty("/Attachments")) {
                    oFormDataModel.setProperty("/Attachments", oAttachmentFields);
                }

                // Store oAttachmentFields as a controller property
                this._attachmentFields = oAttachmentFields;

                oAttachmentFields.forEach((oField, index) => {
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

                    oFileUploader.addParameter(new sap.ui.unified.FileUploaderParameter({
                        name: "Accept-CH",
                        value: "Viewport-Width"
                    }));
                    oFileUploader.addParameter(new sap.ui.unified.FileUploaderParameter({
                        name: "Accept-CH",
                        value: "Width"
                    }));
                    oFileUploader.addParameter(new sap.ui.unified.FileUploaderParameter({
                        name: "Accept-CH-Lifetime",
                        value: "86400"
                    }));

                    var oItemTemplate = new sap.m.ColumnListItem({
                        cells: [
                            new sap.m.Input({
                                value: "{formDataModel>description}"
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

                    // Bind the table to a single item (not a "files" array)
                    oTable.bindItems({
                        path: "formDataModel>/Attachments",
                        template: oItemTemplate,
                        filters: [
                            new sap.ui.model.Filter({
                                path: "description",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: oField.description
                            })
                        ]
                    });

                    oMainVBox.addItem(new sap.m.VBox({
                        items: [
                            new sap.m.Title({
                                text: oField.description,
                                level: "H3"
                            }),
                            oTable
                        ]
                    }).addStyleClass("attachmentTableSection"));
                });

                oContainer.addContent(new sap.m.VBox({
                    items: [
                        oMainVBox
                    ]
                }));

                var oCustomCSS = `
                    .attachmentTableSection {
                        margin-bottom: 2rem;
                    }
                    .attachmentTableSection .sapMTitle {
                        margin-bottom: 0.5rem;
                    }
                `;
                $('<style>').text(oCustomCSS).appendTo('head');
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
                    action: "CREATE",
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
                    Attachments: oFormData["Attachments"].map(attachment => ({
                        REGESTERED_MAIL: oFormData["Supplier Information"]["Supplier Information"]["REGISTERED_ID"]?.value || "p5ak7@edny.net",
                        DESCRIPTION: attachment.description,
                        ATTACH_SHORT_DEC: "TEST",
                        IMAGEURL: attachment.imageUrl ? attachment.imageUrl.split(",")[1] : "",
                        IMAGE_FILE_NAME : attachment.description
                    }))
                };

                console.log("Final Payload:", payload);
                return payload;
            },

            submitForm: function () {
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
                        console.log("Form submitted successfully:", oData, oResponse);
                        MessageBox.success("Form submitted successfully!", {
                            onClose: function () {
                                this.getOwnerComponent().getRouter().navTo("RouteInstructionView");
                            }.bind(this)
                        });
                    }.bind(this),
                    error: function (oError) {
                        console.error("Error submitting form:", oError);
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