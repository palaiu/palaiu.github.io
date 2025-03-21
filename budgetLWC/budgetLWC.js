import { api, LightningElement, wire, track } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import userId from '@salesforce/user/Id';
import templateOne from "./templateOne.html";
import templateTwo from "./templateTwo.html";
import templateThree from "./templateThree.html";
import templateFour from "./templateFour.html";
import templatePieceDetails from "./templatePieceDetails.html";
import getBudgectInformation from '@salesforce/apex/TES_BudgetController.getBudgectInformation';
import getProductInformation from '@salesforce/apex/TES_BudgetController.getPricebookItems';
import createOpportunity from '@salesforce/apex/TES_BudgetController.createOpportunity';

//fields
import WORK_STEP_ID_FIELD from '@salesforce/schema/WorkStep.Id';
import IMAGEN from '@salesforce/resourceUrl/imageDoc';
import getPricebookItems from '@salesforce/apex/TES_BudgetController.getPricebookItems';
//import Pricebook2 from '@salesforce/schema/Contract.Pricebook2';

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

	currentUserId = userId;
	showTemplateOne = true;
	showTemplateTwo = false;
	showTemplateThree = false;
	showTemplateFour = false;
	showPieceDetailsScreen = false;
	showConfirmScreen = false;
	showConfirmedOpportunityScreen = false;
	devisTypePicklistOptions = [];
	@track openSpinner = false;
	itemInCart = false;
	isValueWithDiscount = false;
	lockBudgetTitle = true;
	lockDevisType = true;
	lockAssets = true;
	lockCreatedButton = false;
	lockDeclineButton = true;

	@track
	mainEquipmentPicklistOptions = [];
	selectedMainEquipment = '';
	initializationDone = false;
	percentageIVA = 0.21;
	pieceDetailDiscount = 0;
	pieceDetailTotalPrice;
	servicesTotalValue = 0;
	stringServiceAppDuration;
	provisionalEndDate;
	opp2Create;
	oppLineItems2Create = [];
	workStepObj;
	comments;
	newOpportunity;
	dateFormate2Apex;
	totalPrincipalServices_WITH_IVA = 0;
	totalPrincipalServices_WITHOUT_IVA = 0;
	totalPrincipal_IVA = 0;

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

	destinatarioPresupuestoList = [];
	selectedDestinatarioPresupuesto;
	
	@track confimedProductsList = [];
	@track pricebookItemsList = [];
	@track selectedPricebookItemsList = [];
	@track selectedIndividualPricebookItem;
	@track productsVisible = false;
	@track selectedProductListLength = 0;
	showMainAddProduct = false;
	showShoppingCartScreen = false;
	pricebookId;
	

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
		if (this.showPieceDetailsScreen) {
			return templatePieceDetails;
		} else if (this.showTemplateFour){
			return templateFour;
		} else if (this.showTemplateThree) {
			return templateThree;
		} else if (this.showTemplateTwo) {
			return templateTwo;
		} else {
			return templateOne;
		}
	}

	calculateProvisionalDate(){
		let today = new Date();
        let nextMonth = new Date(today.setMonth(today.getMonth() + 1));

		let year = nextMonth.getFullYear();
        let month = String(nextMonth.getMonth() + 1).padStart(2, '0');
        let day = String(nextMonth.getDate()).padStart(2, '0');

		this.dateFormate2Apex = `${day}/${month}/${year}`

		return `${year}-${month}-${day}`;
	}
	

	async getBudgectInformationWrapper(){
		await getBudgectInformation({
			workStepId: this.recordId
		})
		.then((data) => {
			console.log('DATA FROM WRAPPER');
			console.log(JSON.stringify(data));

			// Get Work Order
			if( data.workStepObj ){
				this.workStepObj = data.workStepObj;
				console.log('workStepObj', JSON.stringify(this.workStepObj));
			}
			
			// Get Service Appointment information
			if( data.serviceAppointmentObj ){
				this.serviceAppointment = data.serviceAppointmentObj;

				this.stringServiceAppDuration = String(this.serviceAppointment.Duration + ' ' + this.serviceAppointment.DurationType);
				this.provisionalEndDate = this.calculateProvisionalDate();
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
						phone: data.serviceAppointmentObj.Residence__r.Owner__r.Phone,
						address: data.serviceAppointmentObj.Residence__r.Owner__r.BillingAddress
					})
				}
			} 

			if(data.serviceAppointmentObj.Residence__r.Inhabitant__c){
				if(!this.destinatarioPresupuestoList.includes(data.serviceAppointmentObj.Residence__r.Inhabitant__c)){
					this.destinatarioPresupuestoList.push({
						value: data.serviceAppointmentObj.Residence__r.Inhabitant__c,
						label: data.serviceAppointmentObj.Residence__r.Inhabitant__r.Name,
						phone: data.serviceAppointmentObj.Residence__r.Inhabitant__r.Phone,
						address: data.serviceAppointmentObj.Residence__r.Inhabitant__r.BillingAddress
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
		console.log('Navigating to templateTwo');
	
		this.showTemplateOne = false;
		this.showTemplateTwo = true;
		this.showTemplateThree = false;
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

	handlerAddServices() {
		console.log('Navigating to templateThree');
	
		this.showTemplateOne = false;
		this.showTemplateTwo = false;
		this.showTemplateThree = true;
	}

	handleBackButton() {
		console.log('Handling Back Button');
	
		if (this.showPieceDetailsScreen) {
			console.log('Closing Piece Details Screen');
			this.showPieceDetailsScreen = false;
			this.showTemplateThree = true;
		} else if (this.showTemplateThree) {
			console.log('Going back to templateTwo');
			this.showTemplateOne = false;
			this.showTemplateTwo = true;
			this.showTemplateThree = false;
		} else if (this.showTemplateTwo) {
			console.log('Going back to templateOne');
			this.showTemplateOne = true;
			this.showTemplateTwo = false;
			this.showTemplateThree = false;
		}
	}
	

	//Template 2
	handleDestinatarioPresupuesto(event){
		console.log('account ',event.detail.value);
		this.selectedDestinatarioPresupuesto = this.destinatarioPresupuestoList.find(item => item.value === event.detail.value);

	}

	changeInput(event){
		let id = event.target.dataset.id;

		switch(id) {
			case 'title':
				console.log('Budget Title button clicked');
				!this.lockBudgetTitle ? this.lockBudgetTitle = true : this.lockBudgetTitle = false
				break;

			case 'devisType':
				console.log('Selected Devis Type button clicked');
				!this.lockDevisType ? this.lockDevisType = true : this.lockDevisType = false
				break;

			case 'TypeQuote':
				console.log('Selected Radio Equipments button clicked');
				!this.lockAssets ? this.lockAssets = true : this.lockAssets = false
				break;

			default:
				console.log('Unknown button clicked');
		}
	}

	changeInputBudgetTitle(event){
		this.budgetTitle = event.target.value;
	}

	changeOnDevisTypeInput(event){
		this.selectedDevisType = event.detail.value;
	}

	changeAssetsInput(event){
		for(let key in this.assets){
			if(this.assets[key].value == event.target.value){
				this.selectedRadioEquipments = this.assets[key];
			}
		}
	}

	handleCommentsChange(event){
		this.comments = event.target.value;
	}

	// Uncomment all lines
	async handleRegistrar(){
		this.showConfirmedOpportunityScreen = true;
		// this.lockDeclineButton = true;
		// this.lockCreatedButton = true;
	
		// if(!this.opp2Create){
		// 	this.opp2Create = {
		// 		Name: this.budgetTitle, 
		// 		AccountId: this.selectedDestinatarioPresupuesto, 
		// 		ContactId: this.workStepObj.WorkOrder.ContactId,
		// 		Ordre_d_execution__c: this.workStepObj.WorkOrderId, 
		// 		Agency__c: this.serviceAppointment.ServiceTerritoryId, 
		// 		CloseDate: this.dateFormate2Apex, // only accepts dd/mm/yyy format
		// 		StageName: 'Proposal',
		// 		RecordTypeId: '01209000000mc8AAAQ',
		// 		CurrencyIsoCode: this.confimedProductsList[0].currencyIsoCode, 
		// 		Commentaires__c: this.comments,
		// 		OwnerId: this.currentUserId, 
		// 		Pricebook2Id: this.serviceAppointment.TES_Pricebook2Id__c,
		// 		TECH_Type_de_devis__c: this.selectedDevisType, 
		// 		VAT_rate__c: this.percentageIVA * 100
		// 	}
		// 	console.log('handleRegistrar');
		// 	for(let key in this.confimedProductsList){
		// 		console.log(JSON.stringify(this.confimedProductsList[key]));
		// 		this.oppLineItems2Create.push({
		// 			Quantity: this.confimedProductsList[key].quantity,
		// 			UnitPrice: this.confimedProductsList[key].unitPrice,
		// 			Discount: this.confimedProductsList[key].discount,
		// 			TECH_Garantie_CHAM__c: this.confimedProductsList[key].warantyEnterprise,
		// 			TECH_Garantie_Fournisseur__c: this.confimedProductsList[key].warantyFactory,
		// 			Product2Id: this.confimedProductsList[key].productId,
		// 			UnitPrice: this.confimedProductsList[key].unitPrice,
		// 			TotalPrice: this.confimedProductsList[key].newTotalPrice
		// 		});
		// 	}
		// 	console.log('oppLineItems2Create: ', JSON.stringify(this.oppLineItems2Create));

		// 	// Apex call to create Opportunity
		// 	await createOpportunity({
		// 		opportunityData: JSON.stringify(this.opp2Create),
		// 		productData: JSON.stringify(this.oppLineItems2Create),
		// 	}).then(data => {
		// 		if(data != ''){
		// 			this.lockCreatedButton = true;
		// 			console.log('Complete Oppt')
		// 		}else{
		// 			this.lockCreatedButton = false;
		// 			console.log('Error Oppt')
		// 		}

		// 		if(this.opp2Create){
		// 			this.lockDeclineButton = false;
		// 		}
		// 	});
			
		// }
		
		
		
		
	}

	handleDecline(){
		//Erease all array and return to 1st page

	}


	//Template 3
	onchangeProductName(event){
		this.openSpinner = true;
		console.log('SEARCH');
		console.log('serviceAppointment: ' + JSON.stringify(this.serviceAppointment));

		let discount;
		let warantyFactory;
		let warantyEnterprise;
		let prli;
		
		
		event.preventDefault();
		let input = event.target.value;
		console.log('----> INPUT: ' + input);

		this.pricebookItemsList = [];
		if(input.length > 2){
			
			this.showMainAddProduct = true;

			getProductInformation({
			productNameInput: input,
			pricebookId: this.serviceAppointment.TES_Pricebook2Id__c
			})
			.then((data) => {
			//console.log('----> DATA: ' + JSON.stringify(data));
			//this.allPricebookItems
			

			for (let key in data){
				//console.log('DATA');
				//console.log(JSON.stringify(data));
				if(!this.pricebookItemsList.includes(data[key].Id)){
					
					// Calculate PRLI
					if(data[key].Product2.RecordType.DeveloperName === 'Article' &&
						(data[key].Product2.Famille_d_articles__c === 'Accessoires' ||
						data[key].Product2.Famille_d_articles__c === 'Equipements' ||
						data[key].Product2.Famille_d_articles__c === 'Pièces détachées' ||
						data[key].Product2.Famille_d_articles__c === 'Consommables')
					){
						prli = 1;
					}else{
						prli = 0;
					}

					// Check Warranty and Discount Of Product
					if(data[key].TES_Quote_Coverage_Type__c == "Covered By Warranty" || "Covered By Company Full"){
						discount = 100;
						warantyFactory = false;
		 				warantyEnterprise = true;
					}else if(data[key].TES_Quote_Coverage_Type__c == "Covered By Company Full"){
						discount = 100;
						warantyFactory = false;
		 				warantyEnterprise = true;
					}else if(prli == 1){
						discount = 100;
						warantyFactory = false;
		 				warantyEnterprise = true;
					}else if(prli == 0){
						discount = 100;
						warantyFactory = false;
		 				warantyEnterprise = true;
					}else if(data[key].TES_Quote_Coverage_Type__c == "Article Discount"){
						discount = data[key].Product2.TES_Article_Discount__c;
						warantyFactory = false;
		 				warantyEnterprise = false;
					}else{
						discount = 0;
						warantyFactory = false;
		 				warantyEnterprise = false;
					}



					this.pricebookItemsList.push({
						value: data[key].Id,
						label: data[key].Product2.Name,
						reference: data[key].ProductCode,
						unitPrice: data[key].UnitPrice,
						quantity: 0,
						warantyFactory: warantyFactory,
						warantyEnterprise: warantyEnterprise,
						discount: discount,
						newTotalPrice: data[key].UnitPrice,
						currencyIsoCode: data[key].CurrencyIsoCode,
						productId: data[key].Product2Id
					});
				}
			}
			console.log('----> this.pricebookItemsList.length: ' + this.pricebookItemsList.length);
			//console.log('----> this.pricebookItemsList.: ', JSON.stringify(this.pricebookItemsList));
			this.pricebookItemsList.length > 0 ? this.productsVisible = true : this.productsVisible = false;
			

			//console.log('----> pricebookItemsList: ' + JSON.stringify(this.pricebookItemsList));

			});
			this.openSpinner = false;
		}else{
			this.productsVisible = false;
		}
	}
	
	handlerAddProduct(event) {
		console.log('MAIN ADD');
		console.log('Event:', event);
		let newTotalValueWithDiscount;
	
		let productId = event.currentTarget.dataset.productId;
		console.log('Selected Product ID:', JSON.stringify(productId));
	
		//this.selectedPricebookItemsList.push(this.pricebookItemsList.find(item => item.value === productId));
		this.selectedIndividualPricebookItem = this.pricebookItemsList.find(item => item.value === productId);
	
		// Calculate price with VAT initially
		let priceWithVAT = this.selectedIndividualPricebookItem.unitPrice * (1 + this.percentageIVA);
		console.log('Initial price with VAT:', priceWithVAT);

		if(this.selectedIndividualPricebookItem.discount > 0){
			newTotalValueWithDiscount = priceWithVAT - (priceWithVAT * (this.selectedIndividualPricebookItem.discount / 100));
		}
	
		this.selectedIndividualPricebookItem = {
			...this.selectedIndividualPricebookItem,
			quantity: this.totalSelectedPiece,
			newTotalPrice: newTotalValueWithDiscount == null ? priceWithVAT.toFixed(2) : newTotalValueWithDiscount
		};
	
		console.log('Updated selected product:', JSON.stringify(this.selectedIndividualPricebookItem));
	
		// if (this.selectedPricebookItemsList.length > 0) {
		// 	this.itemInCart = true;
		// 	this.pieceDetailTotalPrice = priceWithVAT;
		// }
	

		this.showPieceDetailsScreen = true;
		this.showTemplateThree = false;
	
		console.log('this.selectedPricebookItemsList', JSON.stringify(this.selectedPricebookItemsList));
	}





	toggleOverlay() {
		console.log("Toggling shopping cart...");
		const container = this.template.querySelector('.shoppingCartContainer');
		if (container) {
			container.classList.toggle('active');
		}
	}
	

	
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

	handleChangeQuantityOfProduct(event){
		this.totalSelectedPiece = parseInt(event.target.value,10);
		this.updatePriceWithVATAndDiscount();
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
		console.log('------------------');
		console.log('updatedProduct: ', JSON.stringify(updatedProduct));



		let index = this.selectedPricebookItemsList.findIndex(product => product.value === updatedProduct.value);

		if (index !== -1) {
			this.selectedPricebookItemsList[index] = {
				...this.selectedPricebookItemsList[index], 
				...updatedProduct 
			};

		} else {
			console.log('Product not found');
			this.selectedPricebookItemsList.push(this.selectedIndividualPricebookItem);
		}

		this.selectedProductListLength = this.selectedPricebookItemsList.length;
		console.log('------------------');
		console.log('updatedProduct: ', JSON.stringify(this.selectedPricebookItemsList));

		// if (this.selectedPricebookItemsList.length > 0) {
		// 	this.itemInCart = true;
		// 	this.pieceDetailTotalPrice = priceWithVAT;
		// }
		console.log(JSON.stringify(this.selectedPricebookItemsList));
	}
	
	handlerCancelChanges(){
		console.log('<--------- CANCEL CHANGES');
		this.selectedPricebookItemsList = this.selectedPricebookItemsList.filter( item => item.value !== this.selectedIndividualPricebookItem.value );

		this.showPieceDetailsScreen = false;
		this.selectedProductListLength = this.selectedPricebookItemsList.length;
		
		if(!this.showPieceDetailsScreen){
			this.showTemplateOne = false;
			this.showTemplateTwo = false;
			this.showTemplateThree = true;
		}

		console.log('----> NEW : this.selectedPricebookItemsList');
		console.log(JSON.stringify(this.selectedPricebookItemsList));
	}



	handlerConfirmChanges(){
		this.updateProduct(this.selectedIndividualPricebookItem);

		this.showPieceDetailsScreen = false;
		
		if(!this.showPieceDetailsScreen){
			this.showTemplateOne = false;
			this.showTemplateTwo = false;
			this.showTemplateThree = true;
		}

		console.log('this.selectedPricebookItemsList', JSON.stringify(this.selectedPricebookItemsList));
	}

	connectedCallback() {
		document.body.classList.add('modal-open');
	}
	
	disconnectedCallback() {
		document.body.classList.remove('modal-open');
	}

	toggleOverlay() {
		const container = this.template.querySelector('.shoppingCartContainer');
		container.classList.toggle('active');
	}

	handlerRemoveAllItems(){
		this.selectedPricebookItemsList = [];
		this.selectedIndividualPricebookItem = null;
		this.selectedProductListLength = 0;
	}

	handlerConfirmAllItems(){
		this.showConfirmScreen = true;
	}

	handlerCancelConfScreen(){
		this.showConfirmScreen = false;
	}

	handlerBackToBudget(){
		this.showConfirmedOpportunityScreen = false;
	}


	handlerTerminateScreen(){
		this.showTemplateTwo = false;
		this.showTemplateFour = true;

		console.log('selected Destinatario Presupuesto', JSON.stringify(this.selectedDestinatarioPresupuesto));
		//console.log('destinatario Presupuesto List', JSON.stringify(this.destinatarioPresupuestoList));

		this.selectedDestinatarioPresupuesto = this.destinatarioPresupuestoList.find(item => item.value === this.selectedDestinatarioPresupuesto);

		console.log('selected Destinatario Presupuesto', JSON.stringify(this.selectedDestinatarioPresupuesto));


		for(let key in this.confimedProductsList){
			console.log('confimedProductsList', JSON.stringify(this.confimedProductsList[key]));
			this.totalPrincipalServices_WITHOUT_IVA += (Number(this.confimedProductsList[key].unitPrice) * Number(this.confimedProductsList[key].quantity));
			this.totalPrincipalServices_WITHOUT_IVA;

			this.totalPrincipalServices_WITH_IVA += (Number(this.confimedProductsList[key].newTotalPrice));
			this.totalPrincipalServices_WITH_IVA;
		}
		this.totalPrincipal_IVA = this.totalPrincipalServices_WITH_IVA / this.percentageIVA;

	}

	handleTerms(){

	}

	handlerConfirmScreen(){
		this.confimedProductsList = this.selectedPricebookItemsList;
		console.log('confimedProductsList');
		console.log(this.confimedProductsList);
		this.selectedPricebookItemsList = [];
		this.selectedIndividualPricebookItem = null;
		this.selectedProductListLength = 0;
		this.showConfirmScreen = !this.showConfirmScreen

		if (this.confimedProductsList.length > 0) {
			this.itemInCart = true;
			this.lockCreatedButton = false;
			//this.pieceDetailTotalPrice = priceWithVAT;
			for(let key in this.confimedProductsList){
				console.log('key', key);
				console.log('confimedProductsList', JSON.stringify(this.confimedProductsList[key]));
				this.servicesTotalValue += Number(this.confimedProductsList[key].newTotalPrice);
			}
		}

		if(!this.showPieceDetailsScreen){
			this.showTemplateOne = false;
			this.showTemplateTwo = true;
			this.showTemplateThree = false;
		}

		
	}

	get cartContainerClass() {
		return this.showShoppingCartScreen ? "shoppingCartContainer active" : "shoppingCartContainer";
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