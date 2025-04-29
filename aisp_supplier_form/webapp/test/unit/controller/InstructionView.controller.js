/*global QUnit*/

sap.ui.define([
	"com/aispsuppform/aispsupplierform/controller/InstructionView.controller"
], function (Controller) {
	"use strict";

	QUnit.module("InstructionView Controller");

	QUnit.test("I should test the InstructionView controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
