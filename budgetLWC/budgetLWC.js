import { api, LightningElement, wire, track } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import templateOne from "./templateOne.html";
import templateTwo from "./templateTwo.html";
import templateThree from "./templateThree.html";
import templatePieceDetails from "./templatePieceDetails.html";
import getBudgectInformation from '@salesforce/apex/TES_BudgetController.getBudgectInformation';
import getProductInformation from '@salesforce/apex/TES_BudgetController.getPricebookItems';

//fields
import WORK_STEP_ID_FIELD from '@salesforce/schema/WorkStep.Id';
import IMAGEN from '@salesforce/resourceUrl/imageDoc';
import getPricebookItems from '@salesforce/apex/TES_BudgetController.getPricebookItems';

// import SERVICE_APPOINTMENT_ID_FIELD from '@salesforce/schema/ServiceAppointment.Id';
// import SERVICE_APPOINTMENT_RESIDENCE_FIELD from '@salesforce/schema/ServiceAppointment.Residence__c';
// import SERVICE_APPOINTMENT_PRICEBOOK_FIELD from '@salesforce/schema/ServiceAppointment.TES_Pricebook2Id__c';
// import TES_PRICEBOOK_ENTRY_OBJ from '@salesforce/schema/PricebookEntry';
// import TECH_TYPE_FIELD from '@salesforce/schema/Opportunity.TECH_Type_de_devis__c';
// import OPPORTUNITY_OBJECT from '@salesforce/schema/Opportunity';
// import SERVICE_APPOINTMENT_OBJECT from '@salesforce/schema/ServiceAppointment';
// import ASSET_OBJECT from '@salesforce/schema/Asset';
// import getServiceAppointment from '@salesforce/apex/TES_BudgetController.getServiceAppointment';
// import getAssets from '@salesforce/apex/TES_BudgetController.getAssets';
//import { executeQuery } from 'lightning/analyticsWaveApi';
// import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';

export default class BudgetLWC extends LightningElement {

	showTemplateOne = true;
	showTemplateTwo = true;
	showTemplateThree = true;
	showPieceDetailsScreen = false;
	devisTypePicklistOptions = [];
	@track openSpinner = false;
	itemInCart = false;
	isValueWithDiscount = false;

	@track
	mainEquipmentPicklistOptions = [];
	selectedMainEquipment = '';
	initializationDone = false;
	percentageIVA = 0.21;
	pieceDetailDiscount = 0;
	pieceDetailTotalPrice;

	imageUrl = IMAGEN;
	error;
	serviceAppointment;
	assets = [];

	@api
	recordId;
	createButtonLock = false;
	budgetTitle;
	selectedDevisType;
	selectedRadioEquipments = [];

	destinatarioPresupuestoList = []
	selectedDestinatarioPresupuesto

	@track pricebookItemsList = []
	@track selectedPricebookItemsList = []
	@track selectedIndividualPricebookItem;
	@track productsVisible = false;
	showMainAddProduct = false;
	showShoppingCartScreen = false;
	

	@track totalSelectedPiece = 1;



	@wire(getRecord, { recordId: '0hFQI0000000Tut2AE', fields: [WORK_STEP_ID_FIELD] })
    wiredRecord({ error, data }) {
        if (data && !this.initializationDone) {
            console.log(data);
            console.log('Record ID:', data.id);

			console.log('connectedCallback');

			this.recordId = '0hFQI0000000Tut2AE'
			console.log('recordId: ' + this.recordId);

			this.doInit();
			this.initializationDone = true;
        } else if (error) {
            console.error('Error fetching record:', error);
        }
    }

	async doInit(){
		this.createButtonLock = true;
		await this.getBudgectInformationWrapper();
	}

	render() {
		console.log('render');
		switch (true) {
			case this.showTemplateOne:
				console.log('showTemplateOne');
				return templateOne;
			case this.showTemplateTwo:
				console.log('showTemplateTwo');
				return templateTwo;
			case this.showTemplateThree:
				console.log('showTemplateThree');
				this.openSpinner = false;
				return templateThree;
			// case this.showPieceDetailsScreen:
			// 	console.log('templatePieceDetails');
			// 	return templatePieceDetails;
		}
	}

	async getBudgectInformationWrapper(){
		await getBudgectInformation({
			workStepId: this.recordId
		})
		.then((data) => {
			console.log('DATA FROM WRAPPER');
			console.log(JSON.stringify(data));

			// Get Service Appointment information
			if( data.serviceAppointmentObj ){
				this.serviceAppointment = data.serviceAppointmentObj;
			}

			// Get Assets information
			for( let key in data.assets ){
				if( data.assets.length > 0 ){
					this.assets.push({
						value: data.assets[key].Id,
						label: data.assets[key].Name
					});
				}
			}
			this.assets = [...this.assets];

			//Get Devis Picklist Values
			for(let key in data.devisTypePickListValues){
				this.devisTypePicklistOptions.push({
					value: key,
					label: data.devisTypePickListValues[key]
				})
			}
			this.devisTypePicklistOptions = [...this.devisTypePicklistOptions];
			this.selectedDevisType = this.devisTypePicklistOptions[2].value; //This pre-definied the value of the picklist on loading

			//Get Budget Recipient 
			if(data.serviceAppointmentObj.Residence__r.Owner__c){
				if(!this.destinatarioPresupuestoList.includes(data.serviceAppointmentObj.Residence__r.Owner__c)){
					this.destinatarioPresupuestoList.push({
						value: data.serviceAppointmentObj.Residence__r.Owner__c,
						label: data.serviceAppointmentObj.Residence__r.Owner__r.Name,
					})
				}
			} 

			if(data.serviceAppointmentObj.Residence__r.Inhabitant__c){
				if(!this.destinatarioPresupuestoList.includes(data.serviceAppointmentObj.Residence__r.Inhabitant__c)){
					this.destinatarioPresupuestoList.push({
						value: data.serviceAppointmentObj.Residence__r.Inhabitant__c,
						label: data.serviceAppointmentObj.Residence__r.Inhabitant__r.Name,
					})
				}
			}

			if(this.destinatarioPresupuestoList.length > 0){
				this.selectedDestinatarioPresupuesto = this.destinatarioPresupuestoList[0].value; //This pre-definied the value of the picklist on loading
			}

			this.destinatarioPresupuestoList = [...this.destinatarioPresupuestoList];
		});
	}



	handlerBudgetTitle(event){
		console.log('handlerBudgetTitle: ' + event.detail.value);
		this.budgetTitle = event.detail.value;
		
		this.checkRequiredFileds();
	}

	onDevisTypeChange(event) {
		this.selectedDevisType = event.detail.value;
		console.log(this.selectedDevisType);
		this.checkRequiredFileds();
	}

	handleRadioEquipments(event){
		console.log('handleRadioEquipments: ' + event.target.value);

		for(let key in this.assets){
			if(this.assets[key].value == event.target.value){
				this.selectedRadioEquipments = this.assets[key];
			}
			
		}
		
		this.checkRequiredFileds();
	}

	// mainEquipmentPicklist() {
	// 	this.mainEquipmentPicklistOptions = this.assets.map(asset => ({
	// 		label: asset.Name,
	// 		value: asset.Id
	// 	}));
	// }

	onMainEquipmentChange(event) {
		this.selectedMainEquipment = event.detail.value;
	}

	

	handleClose(){

	}

	handleCreateBudget() {
		// this.mainEquipmentPicklist();
		this.showTemplateOne = !this.showTemplateOne;
	}

	checkRequiredFileds(){
		if ( this.selectedDevisType != null && this.selectedRadioEquipments.length != 0 ) {
			this.createButtonLock = false;
			console.log('Create Button Lock: ' + this.createButtonLock);
		} else {
			this.createButtonLock = true;
			console.log('Create Button Lock: ' + this.createButtonLock);
		}
	}

	handlerAddServices(){
		console.log('Clicked Add Services');
		
		this.showTemplateOne = false;
		this.showTemplateTwo = false;
		this.showTemplateThree = true;

		
	}

	handleBackButton(){
		this.openSpinner = true;

		if(this.showTemplateTwo){
			this.showTemplateOne = true;
			this.showTemplateTwo = false;
		}else if(this.showTemplateThree){
			this.showTemplateOne = false;
			this.showTemplateTwo = true;
			this.showTemplateThree = false;
		}
		// else if(this.showPieceDetailsScreen){
		// 	this.showTemplateOne = false;
		// 	this.showTemplateTwo = false;
		// 	this.showTemplateThree = true;
		// }
		
		


	}

	//Template 2
	handleDestinatarioPresupuesto(){

	}


	//Template 3
	onchangeProductName(event){
		this.openSpinner = true;
		console.log('SEARCH');
		console.log('serviceAppointment: ' + JSON.stringify(this.serviceAppointment));
		
		event.preventDefault();
		let input = event.target.value;
		console.log('----> INPUT: ' + input);

		this.pricebookItemsList = [];
		if(input.length > 4){
			
			this.showMainAddProduct = true;

			getProductInformation({
			productNameInput: input,
			pricebookId: this.serviceAppointment.TES_Pricebook2Id__c
			})
			.then((data) => {
			//console.log('----> DATA: ' + JSON.stringify(data));
			//this.allPricebookItems
			

			for (let key in data){
				if(!this.pricebookItemsList.includes(data[key].Id)){
					console.log('--------- DENTRO IF -------')
					this.pricebookItemsList.push({
						value: data[key].Id,
						label: data[key].Product2.Name,
						reference: data[key].ProductCode,
						unitPrice: data[key].UnitPrice,
						quantity: 0,
						warantyFactory: true,
						warantyEnterprise: true,
						discount: this.pieceDetailDiscount,
						newTotalPrice: data[key].UnitPrice
					});
				}
			}
			console.log('----> this.pricebookItemsList.length: ' + this.pricebookItemsList.length);
			this.pricebookItemsList.length > 0 ? this.productsVisible = true : this.productsVisible = false;
			

			//console.log('----> pricebookItemsList: ' + JSON.stringify(this.pricebookItemsList));

			});
			this.openSpinner = false;
		}else{
			this.productsVisible = false;
		}
	}
	
	handlerAddProduct(event){
		//console.log('MAIN ADD');
		//console.log('Event:', event);
		//this.showMainAddProduct = false;
		//this.pricebookItemsList
	
		let productId = event.currentTarget.dataset.productId;
		//console.log('Selected Product ID:', JSON.stringify(productId));
	
		this.selectedPricebookItemsList.push(this.pricebookItemsList.find(item => item.value === productId));
		this.selectedIndividualPricebookItem = this.pricebookItemsList.find(item => item.value === productId);
	
		// Calculate price with VAT initially
		let priceWithVAT = this.selectedIndividualPricebookItem.unitPrice * (1 + this.percentageIVA);
		console.log('Initial price with VAT:', priceWithVAT);
		
		this.selectedIndividualPricebookItem = {
			...this.selectedIndividualPricebookItem,
			quantity: this.totalSelectedPiece,
			newTotalPrice: priceWithVAT.toFixed(2)
		}
	
		//console.log(JSON.stringify(this.selectedPricebookItemsList));
	
		if(this.selectedPricebookItemsList.length > 0){
			this.itemInCart = true;
			this.pieceDetailTotalPrice = priceWithVAT;
			//this.showShoppingCartScreen = true;
		}
	
		//--- OPEN PIECE DETAILS SCREEN
		this.showPieceDetailsScreen = true;
		
		// if(this.showPieceDetailsScreen){
		// 	this.showTemplateOne = false;
		// 	this.showTemplateTwo = false;
		// 	this.showTemplateThree = false;
		// }


		console.log('this.selectedPricebookItemsList');
		console.log(JSON.stringify(this.selectedPricebookItemsList));



	}



	// toggleOverlay() {
    //     const overlay = this.template.querySelector('.shoppingCartContainer');
    //     overlay.classList.toggle('active');

	

    //     this.showPieceDetailsScreen = !this.showPieceDetailsScreen;
    // }

	
	// Template Piece Details
	updatePriceWithVATAndDiscount() {
		console.log('Updating price with VAT then discount');
		
		// Calculate base price
		let basePrice = this.selectedIndividualPricebookItem.unitPrice * this.totalSelectedPiece;
		console.log('-- basePrice (unitPrice * quantity):', basePrice);
		
		// Apply VAT first
		let priceWithVAT = basePrice * (1 + this.percentageIVA);
		console.log('-- priceWithVAT (after ' + (this.percentageIVA * 100) + '% VAT):', priceWithVAT);
		
		// Then apply discount if any
		let discountDecimal = this.pieceDetailDiscount / 100;
		console.log('-- discountDecimal:', discountDecimal);
		let finalPrice = priceWithVAT * (1 - discountDecimal);
		console.log('-- finalPrice (after discount):', finalPrice);
		
		this.selectedIndividualPricebookItem = {
			...this.selectedIndividualPricebookItem,
			quantity: this.totalSelectedPiece,
			newTotalPrice: finalPrice.toFixed(2)
		};
		console.log('Updated product after quantity change:', JSON.stringify(this.selectedIndividualPricebookItem));
		
		this.updateProduct(this.selectedIndividualPricebookItem);
	}
	
	increment() {
		console.log('Incrementing quantity from', this.totalSelectedPiece);
		this.totalSelectedPiece += 1;
		console.log('New quantity:', this.totalSelectedPiece);
		this.updatePriceWithVATAndDiscount();
	}
	
	decrement() {
		console.log('Decrementing quantity from', this.totalSelectedPiece);
		if (this.totalSelectedPiece > 0) {
			this.totalSelectedPiece -= 1;
			console.log('New quantity:', this.totalSelectedPiece);
			this.updatePriceWithVATAndDiscount();
		} else {
			console.log('Cannot decrement below 0');
		}
	}

	handleWarantyFactory(event){
		let isCheckedWarantyFactory = event.target.checked;
		
		this.selectedIndividualPricebookItem = {
			...this.selectedIndividualPricebookItem,
			warantyFactory: isCheckedWarantyFactory
		}

		this.updateProduct(this.selectedIndividualPricebookItem);
	}

	handleWarantyEnterprise(event){
		let isCheckedWarantyEnterprise = event.target.checked;
		
		this.selectedIndividualPricebookItem = {
			...this.selectedIndividualPricebookItem,
			warantyEnterprise: isCheckedWarantyEnterprise
		}

		this.updateProduct(this.selectedIndividualPricebookItem);
	}

	handleDiscount(event) {
		let input = event.target.value;
		console.log('DESCONTO input:', input);
		
		if (input !== '' && input >= 0 && input <= 100) {
			console.log('DESCONTO: Valid input detected');
			this.pieceDetailDiscount = parseFloat(input);
			let discountDecimal = this.pieceDetailDiscount / 100;
			console.log('-- discountDecimal:', discountDecimal);
			
			// Calculate base price (quantity * unit price)
			let basePrice = this.selectedIndividualPricebookItem.unitPrice * this.totalSelectedPiece;
			console.log('-- basePrice:', basePrice);
			
			// IVA
			let priceWithVAT = basePrice * (1 + this.percentageIVA);
			console.log('-- priceWithVAT (after ' + (this.percentageIVA * 100) + '% VAT):', priceWithVAT);
			
			// Discount
			let finalPrice = priceWithVAT * (1 - discountDecimal);
			console.log('-- finalPrice (after ' + this.pieceDetailDiscount + '% discount):', finalPrice);
			
			this.selectedIndividualPricebookItem = {
				...this.selectedIndividualPricebookItem,
				discount: this.pieceDetailDiscount,
				newTotalPrice: finalPrice.toFixed(2)
			};
			console.log('Updated product with discount:', JSON.stringify(this.selectedIndividualPricebookItem));
			
			this.updateProduct(this.selectedIndividualPricebookItem);
		} else {
			console.log('DESCONTO: Invalid input, resetting discount');
			// Reset discount if input is invalid
			this.pieceDetailDiscount = 0;
			
			// Reset to original price with IVA
			let basePrice = this.selectedIndividualPricebookItem.unitPrice * this.totalSelectedPiece;
			console.log('-- basePrice:', basePrice);
			let priceWithVAT = basePrice * (1 + this.percentageIVA);
			console.log('-- priceWithVAT (no discount):', priceWithVAT);
			
			this.selectedIndividualPricebookItem = {
				...this.selectedIndividualPricebookItem,
				discount: 0,
				newTotalPrice: priceWithVAT.toFixed(2)
			};
			console.log('Reset product without discount:', JSON.stringify(this.selectedIndividualPricebookItem));
			
			this.updateProduct(this.selectedIndividualPricebookItem);
		}
	}


	updateProduct(updatedProduct) {
		let index = this.selectedPricebookItemsList.findIndex(product => product.value === updatedProduct.value);

		if (index !== -1) {
			this.selectedPricebookItemsList[index] = {
				...this.selectedPricebookItemsList[index], 
				...updatedProduct 
			};
		} else {
			console.log('Product not found');
		}
		console.log(JSON.stringify(this.selectedPricebookItemsList));
	}
	
	handlerCancelChanges(){
		console.log('<--------- CANCEL CHANGES');
		//this.selectedPricebookItemsList = this.selectedPricebookItemsList.filter( item => item.id !== this.selectedIndividualPricebookItem.value );

		this.showPieceDetailsScreen = false;
		
		// if(!this.showPieceDetailsScreen){
		// 	this.showTemplateOne = false;
		// 	this.showTemplateTwo = false;
		// 	this.showTemplateThree = true;
		// }

		console.log('this.selectedPricebookItemsList');
		console.log(JSON.stringify(this.selectedPricebookItemsList));
	}



	handlerConfirmChanges(){
		console.log('---------> CONTINUE WITH CHANGES');
	}


														// @wire(getRecord, { recordId: '0hFQI0000000Tut2AE', fields: [WORK_ORDER_ID_FIELD] })
														// workOrderId;

														// @wire(getServiceAppointment, { workOrderId: '$workOrderField' })
														// wiredServiceAppointment({ error, data }) {
														// 	console.log('wiredServiceAppointment');
															
															
														// 	if (data) {
														// 		this.serviceAppointment = data; // Asigna la cita de servicio al objeto
														// 		this.error = undefined;
														// 	} else if (error) {
														// 		this.error = error;
														// 		this.serviceAppointment = undefined;
														// 	}

														// 	if(this.serviceAppointment != null){
														// 		console.log('do init ?');
														// 		this.doInit();
														// 	}
														// }

	

															/*
																// Llamada a la clase Apex usando wire
																@wire(getAssets, { residenceId: '$serviceAppointment.Residence__c' })
																wiredAssets({ error, data }) {
																	console.log('wiredAssets');
																	console.log(this.serviceAppointment);
																	if (data) {
																		//this.assets = data; // Asigna los activos al array
																		this.assets = data.map(item => ({
																			label: item.Name,
																			value: item.Id
																		}));

																		this.error = undefined;
																	} else if (error) {
																		this.error = error;
																		this.assets = [];
																	}

																	if(this.serviceAppointment != null){
																		console.log('do init ?');
																		this.doInit();
																	}
																}
															*/


																		// @wire(getObjectInfo, { objectApiName: OPPORTUNITY_OBJECT })
																		// opportunityObject;

																		// @wire(getPicklistValues, {
																		// 	recordTypeId: '$opportunityObject.data.defaultRecordTypeId',
																		// 	fieldApiName: TECH_TYPE_FIELD
																		// })
																		// wiredDevisTypePicklist({ error, data }) {
																		// 	console.log('wiredDevisTypePicklist');
																		// 	if (data) {
																		// 		console.log('data: ' + JSON.stringify(data));
																		// 		console.log('data: ' + JSON.stringify(data.values));
																		// 		this.devisTypePicklistOptions = data.values.map(item => ({
																		// 			label: item.label,
																		// 			value: item.value
																		// 		}));
																		// 		this.selectedDevisType = this.devisTypePicklistOptions[2].value;
																		// 	} else if (error) {
																		// 		console.error('Error cargando valores de picklist:', error);
																		// 	}
																		// 	if(this.serviceAppointment != null){
																		// 		console.log('do init ?');
																		// 		this.doInit();
																		// 	}
																		// }




																		// get workOrderField() {
																		// 	if (this.workOrderId.data) {
																		// 		if (this.workOrderId.data.fields.WorkOrderId) {
																		// 			return this.workOrderId.data.fields.WorkOrderId.value;
																		// 		} else {
																		// 			return 'No se muestra el valor';
																		// 		}
																		// 	} else {
																		// 		return 'hola';
																		// 	}
																		// }

																		// get pricebook2IdField() {
																		// 	let interior = console.dir(this.pricebook2id);

																		// 	if (this.pricebook2Id__c.data) {
																		// 		if (this.pricebook2Id__c.data.fields.Pricebook2Id) {
																		// 			return this.pricebook2Id__c.data.fields.Pricebook2Id.value;
																		// 		} else {
																		// 			return 'No se muestra el valor';
																		// 		}
																		// 	} else {
																		// 		return (interior + " hola");
																		// 	}
																		// }


																		// get serviceAppointments() {
																		// 	if (this.serviceAppointment.data) {
																		// 		if (this.serviceAppointment.data.fields.Id) {
																		// 			return this.serviceAppointment.data.fields.Id.value;
																		// 		} else {
																		// 			return 'No se muestra el valor';
																		// 		}
																		// 	} else {
																		// 		return 'hola';
																		// 	}
																		// }

																		// get serviceAppointmentPriceBook() {
																		// 	if (this.serviceAppointment.data) {
																		// 		if (this.serviceAppointment.data.fields.TES_Pricebook2Id__c) {
																		// 			return this.serviceAppointment.data.fields.TES_Pricebook2Id__c.value;
																		// 		} else {
																		// 			return 'No se muestra el valor';
																		// 		}
																		// 	} else {
																		// 		return 'hola';
																		// 	}
																		// }

	

	
}