/**
 * --------------------------------------------------------------------
 * ChartThingy
 *
 * Inspired by FgCharting (JQuery)
 * Heavily refactored to reflect Mootools style 
 * and updated to be light-weight on the DOM usage.
 *
 * --------------------------------------------------------------------
 */

Chart = new Class({
	
	Implements: [Options, Events],
	canvas: false,			// canvas element
	canvasContext: false,	// canvas context
	canvasWrapper: false,	// required wrapper around the canvas
	canvasElement: false,

	options: {
		colors: ['#e9e744','#ee8310','#f45a90','#666699','#5a3b16','#26a4ed','#be1e2d','#8d10ee','#92d5ea'], // default chart bar / line colors
		dimensions:	{ // default chart dimensions
			width:  600,
			height: 400
		},
		chartWrapperStyles: { fontSize: '10px', position:'relative', display: 'inline-block', margin: '1em 0 2em 20px'}

	},
	locked: true,	// chart creation will be locked until a canvas could be created.

	initialize: function(container, options)
	{
		//console.log('Chart base class initialized', container, options);
		
		this.setOptions(options);
		this.addEvent('datachange', this.onDataChange);
		this.addEvent('canvasready', this.unLock);
		this.initCanvas(container);
		
	},

	initCanvas: function(container)						// initalize the canvas, wrap it and unlock it if all goes okay.
	{
		//console.log('initting canvas ', container);
		if ($(container).get('tagname') == 'canvas') {	// are we passed a canvas?
				this.canvasElement = container;
				this.options.dimensions.width= container.getStyle('width').toInt();
				this.options.dimensions.height = container.getStyle('height').toInt();
		}
		else {											// or just a container to put a canvas in?
			this.canvasElement = new Element('canvas',{	width: this.options.dimensions.width, height: this.options.dimensions.height}).injectInside(container);
		}

		this.canvasWrapper = (this.canvasElement.getParent('.chartBlock') != null) ? this.canvasElement.getParent('.chartBlock') :  new Element ('div', {  class: 'chartBlock', styles: this.options.chartWrapperStyles}).wraps(this.canvasElement);
		
		this.canvasContext = this.canvasElement.getContext('2d');	// get the context and clear it.
		this.fireEvent('canvasready', this);
	},

	unLock: function(){
		//console.log('Unlock event received, canvas is ready');
		this.locked = false;
	},

	setData: function(newData) {
		//console.log('received setData for', newData);
		//console.log('current lock state: ', this.locked);
		if(!this.locked) {
			//console.log('fireing dataChanged event');
			this.fireEvent('datachange', newData);
		}
		else {
			if(!this.retryState){ // canvas is not ready yet, retrying in 100ms;
				this.retryState = this.setData.delay(100,  this, newData);
			} else{
				alert('Your browser probably knows no canvas, please get a decent web browser like Firefox, Safari, or Chrome :-)');
			}
		}			 
	},

	clearCanvas: function() { // clear the canvas and make it ready to use.
		this.canvasContext.clearRect(0,0, this.options.dimensions.width, this.options.dimensions.height);	
		this.canvasContext.save();	
	},

	onDataChange: function(newData) { // new data has arrived: draw the labels here, clear the canvas and get drawing!
		//console.log('chart got dataChange event', newData, this);
		newData.setOptions(this.options);
		this.clearCanvas();
		this.writeYLabels(newData.getYLabels());
		this.writeXLabels(newData.getXLabels());
		this.draw(newData.getData());
	},

	cleanUp: function() {	// some housekeeping, detach events here or let subclasses take care of that.
		if(!this.locked && this.canvasWrapper != false) this.canvasWrapper.dispose();
	}
		
});

Chart.XY = new Class({
	Extends: Chart, // an XY chart is a class with an X and Y axis, unlike for instance a pie chart.
	xLabelsElement: false,
	yLabelsElement: false, 

	options: {
			xLabelContainerStyles: { margin: 0, padding: 0 },
			yLabelContainerStyles: {  margin: 0, padding: 0 , position: 'absolute', top: 0, textAlign: 'right', left: '-5em'},
			xLabelStyles: { margin: 0, padding: 0, listStyleType: 'none', listStyleImage: 'none', listStylePosition: 'outside', float: 'left' },
			yLabelStyles: {padding: 0, listStyleType: 'none', listStyleImage: 'none', listStylePosition: 'outside'},
			yScale : 1  // scaling takes care of the space between y labels.		
	},

	initialize: function(container, options) {
			
			this.parent(container, options);
			this.canvasContext.translate(1,this.options.dimensions.height); // start from bottom left.
	},

	onDataChange: function(newData) {
			this.options.yScale = this.options.dimensions.height / newData.getTopValue();
			this.parent(newData);
	},

	writeYLabels: function(yLabels) 
	{	
		if (this.yLabelsElement) this.yLabelsElement.dispose();
		this.yLabelsElement = new Element('ul', {styles: this.options.yLabelContainerStyles}).injectBefore(this.canvasElement);
			
		var liHeight = ((this.options.dimensions.height / yLabels.length) + ((this.options.dimensions.height / yLabels.length) / yLabels.length)) / 10 + 'em';
	
		yLabels.each( function(label){  
				new Element('li', { html: label, styles: this.options.yLabelStyles}).setStyle('height', liHeight).injectTop(this.yLabelsElement);
		}, this);

	},

	writeXLabels: function(xLabels) {

		if(this.xLabelsElement) this.xLabelsElement.dispose();
		this.xLabelsElement = new Element('ul').setStyles(this.options.xLabelContainerStyles).injectAfter(this.canvasElement);
		
		var liWidth = Math.round(this.options.dimensions.width / xLabels.length);
		
		xLabels.each( function(label){ 
			this.xLabelsElement.adopt( new Element('li', {html : label, styles: this.options.xLabelStyles}).setStyle('width',liWidth/10+'em' ) );
		}, this);

		this.options.xInterval = Math.round(this.options.dimensions.width / xLabels.length);
	}
		
});

Chart.Line = new Class({

	Extends: Chart.XY,

	initialize: function(container, options) 
	{
		//console.log('chart.Line initialized', container, options)
		this.parent(container, options)	
	},

	draw: function(data)
	{		
		var cc = this.canvasContext; 
		//console.log('drawing Chart.Line', data, data.length);
		for(var h=0; h <data.length; h++){

			var points = data[h].points;
			var integer = 0;
			
			cc.beginPath();
			cc.lineWidth = 3;
			cc.lineJoin = 'round';
			cc.moveTo(0,-Math.round(points[0] * this.options.yScale));
			
			for(var i=0; i<points.length; i++){
				cc.lineTo(integer,-Math.round(points[i]*this.options.yScale));
				integer+= this.options.xInterval;
			}
			cc.strokeStyle = this.options.colors[h];
			cc.stroke();

			if(this.options.filled){
				cc.lineTo(integer,0);
				cc.lineTo(0,0);
				cc.closePath();
				cc.fillStyle = this.options.colors[h];
				cc.globalAlpha = .3;
				cc.fill();
				cc.globalAlpha = 1.0;
			}
			else 
			{
				cc.closePath();
			}
		}	
					

	}
});

Chart.Bar = new Class({

	Extends: Chart.XY,

	initialize: function(container, options) 
	{
		//console.log('Chart.Bar initialized', container, options)
		this.parent(container, options);
	},

	draw: function(data)
	{
		var cc = this.canvasContext;

		for(var h=0; h< data.length; h++){

			var barWidth = Math.round(this.options.xInterval / (data.length+1));
			var points = data[h].points;
			var integer = 0;

			cc.beginPath();
			cc.strokeStyle = '#000';
			cc.lineWidth = 1;

			for(var i=0; i<points.length; i++){
				cc.moveTo(Math.round(integer+(h*barWidth)), 0);

				var gradient = cc.createLinearGradient(Math.round(integer+(h*barWidth)),0, barWidth, Math.round(-points[i]*this.options.yScale));
				var col = new Color(this.options.colors[h]);
				//console.log(col);
				gradient.addColorStop(0, 'rgba('+col.join(',')+', 0.5);');
				gradient.addColorStop(0.8, 'rgba('+col.join(',')+', 0.9);');
				gradient.addColorStop(1, this.options.colors[h]);
				cc.fillStyle = gradient;

				cc.strokeRect(Math.round(integer+(h*barWidth)), 0, barWidth, Math.round(-points[i]*this.options.yScale))
				cc.fillRect(Math.round(integer+(h*barWidth)), 0, barWidth, Math.round(-points[i]*this.options.yScale))
//				cc.lineTo(Math.round(integer+(h*barWidth)),Math.round(-points[i]*this.options.yScale)); // not pretty enough
				integer+=this.options.xInterval;
			}

			cc.stroke();
			cc.closePath();
		}

	}	
});



Chart.CumulativeLine = new Class({

	Extends: Chart.XY,

	initialize: function(container, options) 
	{
		//console.log('Chart.CumulativeLine initialized', container, options)
		this.parent(container, options)	
	},
		
	onDataChange: function(newData) {
		//console.log('yscale for Cumulativeline');
		this.options.yScale = this.options.dimensions.height / newData.getTopYtotal();
		newData.setOptions(this.options);
		this.clearCanvas();
		this.writeYLabels(newData.getYLabelsCumulative());
		this.writeXLabels(newData.getXLabels());
		this.draw(newData.getData())
	},		

	draw: function(data)
	{
		var cc = this.canvasContext;

		for(var h=0; h<data.length; h++){

			var points = data[h].points;
			var prevPoints = [];
			var nextPrevPoints = [];
			var integer = 0;

			if(data[h+1]) { prevPoints = data[h+1].points; }
			if(data[h+2]){	nextPrevPoints = data[h+2].points; }

			cc.beginPath();
			cc.lineWidth = '3';
			cc.lineJoin = 'round';
			cc.moveTo(0,Math.round(-points[0]*this.options.yScale));

			for(var i=0; i<points.length; i++){
				var prevPoint = 0;
				var nextPrevPoint = 0;
				if(prevPoints[i]) prevPoint = prevPoints[i];
				if(nextPrevPoints[i]) nextPrevPoint = nextPrevPoints[i];
				cc.lineTo(integer,Math.round((-points[i] - prevPoint - nextPrevPoint)*this.options.yScale));
				integer+=this.options.xInterval;
			}
			cc.strokeStyle = this.options.colors[h];
			cc.stroke();
			if(this.options.filled){
				cc.lineTo(integer,0);
				cc.lineTo(0,0);
				cc.closePath();
				cc.fillStyle = this.options.colors[h];
				cc.globalAlpha = .3;
				cc.fill();
				cc.globalAlpha = 1.0;
			}
			else {
				cc.closePath();
			}
		}
	
	}
});




Chart.CumulativeBar = new Class({

	Extends: Chart.CumulativeLine,

	initialize: function(container, options) 
	{
		//console.log('Chart.CumulativeBar initialized', parent, options)	
		this.parent(container, options);
	},

	onDataChange: function(data)
	{	
	this.parent(data);
	},

	draw: function(data)
	{
		var cc = this.canvasContext;
		var linewidth = Math.round(this.options.xInterval*.8);

		for(var h=0; h<data.length; h++){

			var points = data[h].points;
			var integer = 0;
			var prevPoints = [];
			var nextPrevPoints = [];
			
			if(data[h+1]){	prevPoints = data[h+1].points; 	}
			if(data[h+2]){	nextPrevPoints = data[h+2].points;	}
			
			cc.lineWidth = 1;
			cc.fillStyle = this.options.colors[h];
			cc.strokeStyle = '#000' ;

			for(var i=0; i<points.length; i++){
				var prevPoint = 0;
				var nextPrevPoint = 0;
				if(prevPoints[i]) prevPoint = prevPoints[i];
				if(nextPrevPoints[i]) nextPrevPoint = nextPrevPoints[i];
				
				cc.strokeRect(integer, 0, linewidth, Math.round((-points[i] - prevPoint - nextPrevPoint)*this.options.yScale));
				cc.fillRect(integer, 0, linewidth, Math.round((-points[i] - prevPoint - nextPrevPoint)*this.options.yScale));
				
				integer+=this.options.xInterval;
			}
		}
	}
});

Chart.Pie = new Class({
	Extends: Chart,
	
	options: {
		xLabelContainerStyles: { position:'absolute', top: '-2.5em', left: '-3em', listStyle: 'none' },
		xLabelStyles: { position: 'absolute', color: '#000', listStyle: 'none', fontSize: '1.1em', }
	},

	initialize: function(container, options)
	{
		//console.log('initializing Chart.Pie');
		this.parent(container,options);
	},

	onDataChange: function(newData) { // new data has arrived: draw the labels here, clear the canvas and get drawing!
		//console.log('Pie chart got dataChange event', newData, this);
		newData.setOptions(this.options);
		this.clearCanvas();
		this.writeLabelContainer();
		this.draw(newData);
	},
			
	writeLabelContainer: function(xLabels)
	{
		if (this.yLabelsElement) this.yLabelsElement.dispose();
		if (this.xLabelsElement) this.xLabelsElement.dispose();
		this.xLabelsElement = new Element('ul', { styles: this.xLabelContainerStyles }).injectAfter(this.canvasElement);
	},
		
	writeLabel: function(label, position) {
		mergedstyles = $merge({ left: position.x, top: position.y}, this.options.xLabelStyles);
		new Element('li', { html:  label, styles: mergedstyles }).injectInside(this.xLabelsElement);
	},

	draw: function (data) {
		
		var cc = this.canvasContext;
		
		var centerx = this.options.dimensions.width/2;
		var centery = this.options.dimensions.height/2;
		var radius =  this.options.dimensions.height/2-20;
		var grandtotal = data.getDataSum();
		cc.arc(centerx, centery, radius, 0, (Math.PI / 180) * 360, true); // create a full circle.
		//cc.fillStyle = '#ccc';
		
		 
		// Create Radial gradient		
			 
		cc.fillStyle = '#FFF';
		
		cc.fill();
		cc.strokeStyle = '#444';
		cc.lineWidth = 1;

		var total = data.getDataTotals();
		//console.log('totals for drawing pie', total);
		var counter = 0.0;	
		
		for (i = 0; i< total.length; i++)
		{
			var fraction = total[i] / (grandtotal); // determine how big this pie slice will be.
			
			cc.moveTo(centerx, centery);
			cc.beginPath();	// begin drawing a slice of pie

		
			cc.arc(centerx, centery, radius, (counter * Math.PI * 2 - Math.PI * 0.5) , ((counter + fraction) * Math.PI * 2 - Math.PI * 0.5 ), false);
			cc.lineTo(centerx, centery);
			cc.closePath();

			var col = new Color(this.options.colors[i]);
			var gradient= cc.createRadialGradient(centerx,centery,0,centerx,centery,radius);
		
			gradient.addColorStop(0, 'rgba('+col.join(',')+', 0.5);');
			gradient.addColorStop(0.8, 'rgba('+col.join(',')+', 0.9);');
			gradient.addColorStop(1, this.options.colors[i]);
			cc.fillStyle = gradient;
			//cc.fillStyle = this.options.colors[i];
			this.globalAlpha =1;
			cc.stroke();
			cc.globalAlpha = .8;

			cc.fill();			// end drawing slice of pie.
			cc.globalAlpha = 1;
	
			var sliceMiddle = (counter + fraction/2)	// determine the middle of the slice so we can place the label there.
			this.writeLabel(Math.round(fraction*100)+'%', {
					x: centerx + Math.sin(sliceMiddle * Math.PI * 2) * (radius/2), 
					y: centery - Math.cos(sliceMiddle * Math.PI * 2) * (radius/2)
			});						 
			counter+=fraction;	
		}
	},

	
});




ChartThingy = new Class({

	Implements: [Options, Events],
	
	element: $empty,
	tableElement: $empty,

	options: {
		chartType: 'Pie',
		filled: false,
		Cumulative: false,
		canvasElement: $empty,
	},

	initialize: function(container, options) { // pass it an id to a table and a some options

		this.setOptions(options);
		var chartType  = this.options.chartType;
		this.chartClass = new Chart[chartType](container, this.options);
	},
	
	setTableData: function(inputData) {
		this.chartClass.setData(new TableData(inputData));
	},

	setJSONData: function(inputData) {
		this.chartClass.setData(new JSONData(inputData));

	},

	cleanUp: function() {
		this.chartClass.cleanUp();
	}

});



Element.implement({
	
	toChart : function(options) 
	{
		if(this.retrieve('chart')) {
			this.retrieve('chart').cleanUp();
		}
		var thingy = new ChartThingy(new Element('div').injectAfter(this), options);			
		thingy.setTableData(this);
		this.store('chart', thingy);
	}
});




//graph data from table function
// still todo: Trash this class an replace it with something 1/3 it's size that can also do JSON and axis-swapping
TableData = new Class({
	Implements: [Options],
	options: {

	},
	tableObject: false,
	cachedData : {
		xLabels: false,
		data: false,
		topValue: false,
		yTotals: false
	},
	

	initialize: function(tableObject, options)
	{
		this.setOptions(options);
		this.tableObject = $(tableObject);		
	},

	/* Gets the data from the table and sorts it already for cumulative totals. */
	getData: function() {
		if(!this.cachedData.data)
		{
			var data = [];
			this.tableObject.getElements('tbody tr').each(function(row, i) {
				data[i] = { 
					points: row.getElements('td').get('text'), 
				//	color: this.options.colors[i] 
				};				
			///	row.getElement('th').setStyle('backgroundColor', this.options.colors[i]);

				for(j=0; j<data[i].points.length; j++) {
					data[i].points[j] = parseInt(data[i].points[j]);
				}
			}, this);

			this.cachedData.data = data.sort(function(a,b) {
				var x = a.points;
				var y = b.points;
				var xSum = 0;
				var ySum = 0;
				for(i= 0; i<x.length; i++) { xSum += x[i]; }
				for(i=0; i<y.length; i++) { ySum += y[i]; }
				return ((xSum < ySum) ? -1 : ((xSum > ySum) ? 1 : 0));
			}).reverse();
		}
		return this.cachedData.data;
	},

	getAllData: function() {
		var allData = [];
		var data = this.getData();

		data.each(function(row) {
			allData.push(row.points);
		});
		return allData;
	},

	getDataSum: function(){
		if(!this.cachedData.dataSum)
		{
			var dataSum = 0;
			this.getAllData().each(function(points){
				for(i=0; i<points.length;i++)
				{
					dataSum += parseInt(points[i]);
				}
			});
			this.cachedData.dataSum = dataSum;
		}
		return this.cachedData.dataSum;
	},	

	getTopValue: function(){
		
		if(!this.cachedData.topValue)
		{
			var topValue = 0;
			var allData = this.getAllData();
			for(i=0; i< allData.length; i++)
			{
				for (var j=0; j<allData[i].length; j++)
				{
					if(parseInt(allData[i][j])>topValue) topValue = parseInt(allData[i][j]);
				}
			}
			this.cachedData.topValue = topValue;
		}
		return this.cachedData.topValue;
	},
	
	getDataTotals: function() {
		if(!this.cachedData.totals)
		{
			var totals = [];
			data = this.getData().each(function(row){
				var count = 0;
				for(i=0; i<row.points.length; i++) {
					count += row.points[i];
				}
				totals.push(count);
			});
			this.cachedData.totals = totals;
		}
		return totals;
	},
		//todo
	getYTotals: function() {
		if(!this.cachedData.yTotals)
		{
			var yTotals = [];
			var data = this.getData();
			for(var i = 0; i< this.getXLabels().length; i++) 
			{
				yTotals[i] = 0;
				for(var j = 0; j< data.length; j++) 
				{
					yTotals[i] += data[j].points[i];
				}
			}
			this.cachedData.yTotals = yTotals;
		}
		return this.cachedData.yTotals;
	},
	
	getTopYtotal: function(){
		var topYtotal = 0;
		var yTotals = this.getYTotals();
		for(i=0; i<yTotals.length; i++)
		{
			if(parseInt(yTotals[i]) > topYtotal) topYtotal = parseInt(yTotals[i]);
		}
		return topYtotal;
	},

	getXLabels: function(){
		if(!this.cachedData.xLabels) {
			this.cachedData.xLabels = this.tableObject.getElements('thead tr th').get('html');
		}

		return this.cachedData.xLabels;
	},

	getYLabels: function(){
		var yLabels = [];
		var chartHeight = this.options.dimensions.height;
		var numLabels = chartHeight / 30;
		var loopInterval = Math.round(this.getTopValue() / numLabels);

		for(var j=0; j<=numLabels; j++) {
			yLabels.push(j*loopInterval);
		}
		if(yLabels[numLabels] != this.getTopValue()) {
			yLabels.pop();
			yLabels.push(this.getTopValue());
		}
		
		return yLabels;
	},

	getYLabelsCumulative: function(){
		var yLabelsCumulative = [];
		var chartHeight = this.options.dimensions.height;
		var numLabels = chartHeight / 30;
		var loopInterval = Math.round(this.getTopYtotal() / numLabels);

		for(var j=0; j<=numLabels; j++){
			yLabelsCumulative.push(j*loopInterval);
		}
		if(yLabelsCumulative[numLabels] != this.getTopYtotal()) {
			yLabelsCumulative.pop();
			yLabelsCumulative.push(this.getTopYtotal());
		}
		return yLabelsCumulative;
	}				
					
					
});//end graphData


/*
Script: Color.js
	Class for creating and manipulating colors in JavaScript. Supports HSB -> RGB Conversions and vice versa.

	License:
		MIT-style license.

	Authors:
		Valerio Proietti
*/

var Color = new Native({

	initialize: function(color, type){
		if (arguments.length >= 3){
			type = 'rgb'; color = Array.slice(arguments, 0, 3);
		} else if (typeof color == 'string'){
			if (color.match(/rgb/)) color = color.rgbToHex().hexToRgb(true);
			else if (color.match(/hsb/)) color = color.hsbToRgb();
			else color = color.hexToRgb(true);
		}
		type = type || 'rgb';
		switch (type){
			case 'hsb':
				var old = color;
				color = color.hsbToRgb();
				color.hsb = old;
			break;
			case 'hex': color = color.hexToRgb(true); break;
		}
		color.rgb = color.slice(0, 3);
		color.hsb = color.hsb || color.rgbToHsb();
		color.hex = color.rgbToHex();
		return $extend(color, this);
	}

});

Color.implement({

	mix: function(){
		var colors = Array.slice(arguments);
		var alpha = ($type(colors.getLast()) == 'number') ? colors.pop() : 50;
		var rgb = this.slice();
		colors.each(function(color){
			color = new Color(color);
			for (var i = 0; i < 3; i++) rgb[i] = Math.round((rgb[i] / 100 * (100 - alpha)) + (color[i] / 100 * alpha));
		});
		return new Color(rgb, 'rgb');
	},

	invert: function(){
		return new Color(this.map(function(value){
			return 255 - value;
		}));
	},

	setHue: function(value){
		return new Color([value, this.hsb[1], this.hsb[2]], 'hsb');
	},

	setSaturation: function(percent){
		return new Color([this.hsb[0], percent, this.hsb[2]], 'hsb');
	},

	setBrightness: function(percent){
		return new Color([this.hsb[0], this.hsb[1], percent], 'hsb');
	}

});

var $RGB = function(r, g, b){
	return new Color([r, g, b], 'rgb');
};

var $HSB = function(h, s, b){
	return new Color([h, s, b], 'hsb');
};

var $HEX = function(hex){
	return new Color(hex, 'hex');
};

Array.implement({

	rgbToHsb: function(){
		var red = this[0], green = this[1], blue = this[2];
		var hue, saturation, brightness;
		var max = Math.max(red, green, blue), min = Math.min(red, green, blue);
		var delta = max - min;
		brightness = max / 255;
		saturation = (max != 0) ? delta / max : 0;
		if (saturation == 0){
			hue = 0;
		} else {
			var rr = (max - red) / delta;
			var gr = (max - green) / delta;
			var br = (max - blue) / delta;
			if (red == max) hue = br - gr;
			else if (green == max) hue = 2 + rr - br;
			else hue = 4 + gr - rr;
			hue /= 6;
			if (hue < 0) hue++;
		}
		return [Math.round(hue * 360), Math.round(saturation * 100), Math.round(brightness * 100)];
	},

	hsbToRgb: function(){
		var br = Math.round(this[2] / 100 * 255);
		if (this[1] == 0){
			return [br, br, br];
		} else {
			var hue = this[0] % 360;
			var f = hue % 60;
			var p = Math.round((this[2] * (100 - this[1])) / 10000 * 255);
			var q = Math.round((this[2] * (6000 - this[1] * f)) / 600000 * 255);
			var t = Math.round((this[2] * (6000 - this[1] * (60 - f))) / 600000 * 255);
			switch (Math.floor(hue / 60)){
				case 0: return [br, t, p];
				case 1: return [q, br, p];
				case 2: return [p, br, t];
				case 3: return [p, q, br];
				case 4: return [t, p, br];
				case 5: return [br, p, q];
			}
		}
		return false;
	}

});