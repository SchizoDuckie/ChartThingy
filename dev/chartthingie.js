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
		chartWrapperStyles: { fontSize: '10px', position:'relative', display: 'inline-block', margin: '1em 0 2em 20px'},
		legendStyles: { border: '1px solid black', position: 'absolute', right: -110, width: 100, top: 0, padding: 5, margin: 5, backgroundColor: 'white' },
		legendElStyles: { margin: 5, marginLeft: 20, listStyleType:'none', fontSize: 12 },
		legendElBlockStyles: { width: 10, height: 10, marginLeft: -15, border: '1px solid black', float: 'left', clear:'left' },
		titleStyles: { textAlign: 'center' }
	},
	locked: true,	// chart creation will be locked until a canvas could be created.

	initialize: function(container, options)
	{
		//console.log('Chart base class initialized', container, options);
		
		this.setOptions(options);
		this.addEvent('datachange', this.onDataChange.bind(this));
		this.addEvent('canvasready', this.unLock.bind(this));
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
		if(!this.locked) {
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
		this.writeTitle(newData.getTitle());
		this.writeLegend(newData.getYLabels());
		this.writeYLabels(newData.calculateYLabels());
		this.writeXLabels(newData.getXLabels());

		this.draw(newData.getData());
	},

	writeTitle: function(title)
	{
		this.title = new Element('h3', { html: title, styles: $merge({width: this.options.dimensions.width}, this.options.titleStyles)}).injectBefore(this.canvasWrapper);
	},

	writeLegend: function(labels)
	{
		this.legend = new Element('ul', {styles: this.options.legendStyles}).injectAfter(this.canvasElement);
		labels.each(function(label, i) {
			new Element('li', {html: label, styles: this.options.legendElStyles}).injectInside(this.legend).adopt(new Element('div', { styles: $merge(this.options.legendElBlockStyles, {backgroundColor: this.options.colors[i]}) }));

		},this);
	},

	cleanUp: function() {	// some housekeeping, detach events here or let subclasses take care of that.
		if(!this.locked && this.canvasWrapper != false) this.canvasWrapper.dispose();
		this.legend.dispose();
		this.title.dispose();
	}
		
});

Chart.XY = new Class({
	Extends: Chart, // an XY chart is a class with an X and Y axis, unlike for instance a pie chart.
	xLabelsElement: false,
	yLabelsElement: false, 

	options: {
			xLabelContainerStyles: { margin: 0, padding: 0 },
			yLabelContainerStyles: {  margin: 0, padding: 0 , position: 'absolute', top: 0, textAlign: 'right', left: '-5em'},
			xLabelStyles: { margin: 0, padding: 0, marginRight: -20, paddingRight: 20, listStyleType: 'none', listStyleImage: 'none', listStylePosition: 'outside', float: 'left', textAlign: 'center', '-moz-transform': 'rotate(-45deg)', '-webkit-transform': 'rotate(-45deg)'},
			yLabelStyles: {padding: 0, listStyleType: 'none', listStyleImage: 'none', listStylePosition: 'outside'},
			yScale : 1  // scaling takes care of the space between y labels.		
	},

	initialize: function(container, options) {
			
			this.parent(container, options);
			var cc = this.canvasContext;
			cc.translate(1,this.options.dimensions.height); // start from bottom left.
			cc.beginPath();
			cc.moveTo(-1, -this.options.dimensions.height);
			cc.strokeStyle = '#000';
			cc.lineWidth = 1;
			cc.lineTo(-1, 0);
			cc.lineTo(this.options.dimensions.width,0);
			cc.stroke();
			cc.closePath();
	},

	onDataChange: function(newData) {
			this.options.yScale = this.options.dimensions.height / newData.getTopValue().roundTo(10);
			this.parent(newData);
	},

	writeYLabels: function(yLabels) 
	{	
		if (this.yLabelsElement) this.yLabelsElement.dispose();
		this.yLabelsElement = new Element('ul', {styles: this.options.yLabelContainerStyles}).injectBefore(this.canvasElement);
			console.log(yLabels);
		var liHeight = ((this.options.dimensions.height / yLabels.length) + ((this.options.dimensions.height / yLabels.length) / yLabels.length)) / 10 ;
		var cc = this.canvasContext;
		
		yLabels.each( function(label, i ){  

				new Element('li', { html: label, styles: $merge(this.options.yLabelStyles, {height: liHeight+'em'})}).injectTop(this.yLabelsElement);
				cc.beginPath();
				cc.moveTo(0,-parseInt(label)*this.options.yScale);
				cc.strokeStyle = '#000';
				cc.lineWidth = 0.2;
				cc.lineTo(this.options.dimensions.width,-parseInt(label)*this.options.yScale);
				cc.stroke();
				cc.closePath();
		}, this);

		cc.closePath();
		cc.fillStyle='#abcdef';
		cc.fill();		
		console.log("filling");			
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

				cc.fillStyle = this.options.colors[h];

				cc.strokeRect(Math.round(integer+(h*barWidth)), 0, barWidth, Math.round(-points[i]*this.options.yScale))
				cc.fillRect(Math.round(integer+(h*barWidth)), 0, barWidth, Math.round(-points[i]*this.options.yScale))

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
		this.writeTitle(newData.getTitle());
		this.writeLegend(newData.getYLabels());
		this.writeYLabels(newData.calculateYLabelsCumulative());
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




Chart.Pie = new Class({
	Extends: Chart,
	
	options: {
		xLabelContainerStyles: { position:'absolute', top: '-2.5em', left: '-3em', listStyle: 'none' },
		xLabelStyles: { position: 'absolute', color: '#000', listStyle: 'none', fontSize: '1.1em', }
	},

	initialize: function(container, options)
	{
		this.parent(container,options);
	},

	onDataChange: function(newData) { // new data has arrived: draw the labels here, clear the canvas and get drawing!
		newData.setOptions(this.options);
		this.clearCanvas();
		this.writeTitle(newData.getTitle());
		this.writeLegend(newData.getYLabels());
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
		data = data.getAllData();
		var grandtotal = data.sum();
		cc.arc(centerx, centery, radius, 0, (Math.PI / 180) * 360, true); // create a full circle.
		//cc.fillStyle = '#ccc';
		
		 
		// Create Radial gradient		
			 
		cc.fillStyle = '#FFF';
		
		cc.fill();
		cc.strokeStyle = '#444';
		cc.lineWidth = 1;

		//console.log('totals for drawing pie', total);
		var counter = 0.0;	
		
		for (i = 0; i< data.length; i++)
		{
			var fraction = data[i].sum() / (grandtotal); // determine how big this pie slice will be.
			
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
		yTotals: false,
		yLabels: false
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
					label: row.getElement('th').get('html')
				};	
				
				for(j=0; j<data[i].points.length; j++) {
					data[i].points[j] = parseInt(data[i].points[j])
				}
			}, this);
			this.cachedData.data = data;
			/*this.cachedData.data = data.sort(function(a,b) {
				return a.points.sum() > b.points.sum() ? 1 : 0;
			}).reverse();
			*/
		}
		return this.cachedData.data;
	},

	getAllData: function() {
		var allData = [];
		this.getData().each(function(row) {
			allData.push(row.points);
		});
		return allData;
	},

	getDataSum: function(){
		if(!this.cachedData.dataSum) this.cachedData.dataSum = this.getAllData().sum();
		return this.cachedData.dataSum;
	},	

	getTopValue: function(){
		if(!this.cachedData.topValue) this.cachedData.topValue = this.getAllData().max();
		return this.cachedData.topValue;
	},
	
	getDataTotals: function() {
		if(!this.cachedData.total)	this.cachedData.total = this.getData().sum();
		return this.cachedData.total;
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
		if(!this.cachedData.xLabels) this.cachedData.xLabels = this.tableObject.getElements('thead tr th').get('html');
		return this.cachedData.xLabels;
	},

	getYLabels: function() {
		if(!this.cachedData.yLabels) this.cachedData.yLabels = this.tableObject.getElements('tbody tr th').get('html');
		return this.cachedData.yLabels;
	},
	
	getTitle: function()
	{
		if(this.tableObject.getElement('caption')) {
			return(this.tableObject.getElement('caption').get('html'));
		}
	},

	calculateYLabels: function(){
		var yLabels = [];
		var chartHeight = this.options.dimensions.height;
		var numLabels = chartHeight /40;
		console.log('# ', numLabels, this.getTopValue().roundTo(10));
		var loopInterval = this.getTopValue().roundTo(10) / numLabels;

		for(var j=0; j<=numLabels; j++) {
			yLabels.push((j*loopInterval).roundTo(10));
		}
		if(yLabels[numLabels] != this.getTopValue().roundTo(10)) {
			yLabels.pop();
			yLabels.push(Math.round(this.getTopValue().roundTo(10)));
		}		
		return yLabels;
	},

	calculateYLabelsCumulative: function(){
		var yLabelsCumulative = [];
		var chartHeight = this.options.dimensions.height;
		var numLabels = chartHeight / 30;
		var loopInterval = Math.round(this.getTopYtotal().roundTo(10) / numLabels);


		for(var j=0; j<=numLabels; j++){
			yLabelsCumulative.push(j*loopInterval);
		}
		if(yLabelsCumulative[numLabels] != this.getTopYtotal().roundTo(10)) {
			yLabelsCumulative.pop();
			yLabelsCumulative.push(this.getTopYtotal().roundTo(10));
		}
		return yLabelsCumulative;
	}				
					
					
});//end graphData



/* ChartThingy array extensions */
Array.implement({
	
	/** 
	 * Recursive array.sum
	 */
	sum: function() {
		var total = 0;
		for (var i = 0; i < this.length; i++) {
			total += ($type(this[i]) == 'array') ? this[i].sum() : this[i];	
		}
		return total;
	},
	
	/**
	 * Recursive array.max 
	 */ 
	max: function() {
		var max = 0;
		for (var i = 0; i<this.length; i++) {
			var curMax = ($type(this[i]) == 'array') ? this[i].max() : this[i];
			max = curMax > max ? curMax : max; 
		}
		return max;
	}

}); 

Number.implement({

	roundTo: function(number){
		console.log('rounding '+this+' to nearest '+number+ ' : ' +this / number + ' % ' + Math.round( this / number) * number);
		return Math.round( this / number) * number;
	}

});
