import { Sayer } from '../common/morestuff';

declare var require;

//var jQuery = require('jquery');
var $ = require('jquery');
var foundation = require('foundation-sites');


$(document).ready(setRunt);

function setRunt() {
	$(document).foundation();
	$('#runt').click( pusser );	
	$('#toggly').click(toggit);
	$('#colory').click(yellowy);
}

function toggit() {
	$('#stain').toggle();
}

function yellowy() {
	$('#stain').toggleClass('yellowy');
}


function pusser() {
	var sayy = new Sayer();
	alert('secondary runt sed '+sayy.sayit());
	$('#stain').toggle();
}
