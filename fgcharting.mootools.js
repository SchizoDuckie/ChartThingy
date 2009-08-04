/**
 * --------------------------------------------------------------------
 * ChartThingy
 *
 * Inspired by FgCharting
 * Heavily refactored to reflect Mootools style 
 * and updated to be light-weight on the DOM usage.
 *
 * --------------------------------------------------------------------
 */

ChartThingy = new Class({

	Implements: [Options, Events],
	
	element: $empty,
	tableElement: $empty,

	options:
	{
		chartType: 'line',
		filled: false,
		additive: false,
		canvasElement: $empty,
		dimensions:
		{
			width:  600,
			height: 400
		},
		colors: ['#e9e744','#ee8310','#f45a90','#666699','#5a3b16','#26a4ed','#be1e2d','#8d10ee','#92d5ea']
	},

	initialize: function(tableElement, options) { // pass it an id to a table and a canvas

		this.tableElement = $(tableElement);
		this.tableElement.set('id', this.tableElement.get('id') ? this.tableElement.get('id') : 'source_' +$uid());
		
		this.setOptions(options);
		
		if(!$(this.options.canvasElement))
		{
			//console.log('creating new canvas');
			this.options.canvasElement = new Element('canvas',{
					width: this.options.dimensions.width, 
					height: this.options.dimensions.height
			}).injectAfter(this.tableElement);
		}
			

		this.tableData = new TableData(this.tableElement, this.options);
	
		if(!this.options.canvasElement.getParent('.chartBlock')) {	
			this.canvasWrapper = new Element ('div', { scalable: this.options.scalable, class: 'chartBlock', styles: { fontSize: 10, position:'relative', display: 'inline-block', margin: '1em 0 2em 20px'}}).wraps(this.options.canvasElement);
		}
		
		
		switch (this.options.chartType)
		{
			case 'line':
				this.chartClass = new Chart['Bar'](options);
			case 'bar':
					this.writeLabels( this.tableData.getXLabels(), (this.options.additive) ? this.tableData.getYLabelsAdditive() : this.tableData.getYLabels());
			case 'pie':				
					this.createGraph(this.options.chartType);			
			break;
		}
	},
	
	writeLabels: function(xLabels, yLabels)
	{
		this.options.xInterval = Math.round(this.options.dimensions.width / xLabels.length);
	
		//write X labels
		var xLabelID = this.tableElement.get('id')+'_data';
		if($(xLabelID)) $(xLabelID).dispose();

		xLabelsElement = new Element('ul', { 
				id: xLabelID, 
				styles: { 
					margin: 0, 
					padding:0
			}}).injectAfter(this.options.canvasElement);
		
		xLabels.each( function(label){ 
			xLabelsElement.adopt( new Element('li', {
				html : label, 
				styles: {		
					listStyle: 'none', 
					float: 'left', 
					width: this.options.xInterval/10+'em',
					margin: 0, 
					padding:0
				}}));
		}, this);
		

		//write Y labels
		this.options.yScale = (!this.options.additive) ? this.options.dimensions.height /this.tableData.getTopValue() : this.options.dimensions.height / this.tableData.getTopYtotal();
	
		var liHeight = this.options.dimensions.height / yLabels.length;
		
		liHeight += liHeight / yLabels.length;
		
		var yLabelID = this.tableElement.get('id')+'_dataY';
		if ($(yLabelID)) $(yLabelID).dispose();

		this.yLabelsElement = new Element('ul', {
				id: yLabelID, 
				styles: {
					margin: 0, 
					padding: 0,
					position:'absolute', 
					top: 0, 
					textAlign: 'right', 
					left: '-5em',
					width: 40
				}	
		}).injectBefore(this.options.canvasElement);
		
		
		yLabels.each( function(label){  
				new Element('li', { 
					html: label, 
						styles: {
						padding:0, 
						listStyle: 'none', 
						height: liHeight/10+'em'
					}
				}).injectTop(this.yLabelsElement);
			}.bind(this));
		

	},
		//create Line graph function
	createGraph : function(graphType){
		//console.log('creating graph: ', graphType);
	
		var ctx = this.options.canvasElement;
		ctx = ctx.getContext('2d');
		ctx.clearRect(0,0, this.options.dimensions.width, this.options.dimensions.height);	
		ctx.save();	

		var members = this.tableData.getMembers();
		switch(graphType)
		{
			case 'line':				
				ctx.translate(0,this.options.dimensions.height); // start from bottom left.
				if(!this.options.additive) 
				{
					for(var h=0; h <members.length; h++){
						ctx.beginPath();
						ctx.lineWidth = '3';
						ctx.lineJoin = 'round';
						var points = members[h].points;
						var integer = 0;
						ctx.moveTo(0,-Math.round(points[0] * this.options.yScale));
						for(var i=0; i<points.length; i++){
							ctx.lineTo(integer,-Math.round(points[i]*this.options.yScale));
							integer+= this.options.xInterval;
						}
						ctx.strokeStyle = this.options.colors[h];
						ctx.stroke();

						if(this.options.filled){
							ctx.lineTo(integer,0);
							ctx.lineTo(0,0);
							ctx.closePath();
							ctx.fillStyle = this.options.colors[h];
							ctx.globalAlpha = .3;
							ctx.fill();
							ctx.globalAlpha = 1.0;
						}
						else 
						{
							ctx.closePath();
						}
					}
				}
				else
				{	
						for(var h=0; h<this.tableData.getMembers().length; h++){
						ctx.beginPath();
						ctx.lineWidth = '3';
						ctx.lineJoin = 'round';
						var points = this.tableData.getMembers()[h].points;
						var prevPoints = [];
						if(this.tableData.getMembers()[h+1]){
							prevPoints = this.tableData.getMembers()[h+1].points;
						}
						var nextPrevPoints = [];
						if(this.tableData.getMembers()[h+2]){
							nextPrevPoints = this.tableData.getMembers()[h+2].points;
						}
						var integer = 0;
						ctx.moveTo(0,Math.round(-points[0]*this.options.yScale));
						for(var i=0; i<points.length; i++){
							var prevPoint = 0;
							var nextPrevPoint = 0;
							if(prevPoints[i]) prevPoint = prevPoints[i];
							if(nextPrevPoints[i]) nextPrevPoint = nextPrevPoints[i];
							ctx.lineTo(integer,Math.round((-points[i] - prevPoint - nextPrevPoint)*this.options.yScale));
							integer+=this.options.xInterval;
						}
						ctx.strokeStyle = this.options.colors[h];
						ctx.stroke();
						if(this.options.filled){
							ctx.lineTo(integer,0);
							ctx.lineTo(0,0);
							ctx.closePath();
							ctx.fillStyle = this.options.colors[h];
							ctx.fill();
						}
						else ctx.closePath();
					}
				}
			break;
			case 'bar':
				ctx.translate(0,this.options.dimensions.height); // start from bottom left.
				if(!this.options.additive)
				{
					for(var h=0; h<this.tableData.getMembers().length; h++){
						ctx.beginPath();
						var linewidth = Math.round(this.options.xInterval / (this.tableData.getMembers().length+1));
						ctx.lineWidth = linewidth;
						var points = this.tableData.getMembers()[h].points;
						var integer = 0;
						
						for(var i=0; i<points.length; i++){
							ctx.moveTo(Math.round(integer+(h*linewidth)), 0);
							ctx.lineTo(Math.round(integer+(h*linewidth)),Math.round(-points[i]*this.options.yScale));
							integer+=this.options.xInterval;
						}
						
						ctx.strokeStyle = this.options.colors[h];
						ctx.stroke();
						ctx.closePath();
					}
				}
				else
				{
					for(var h=0; h<this.tableData.getMembers().length; h++){
						ctx.beginPath();
						var linewidth = Math.round(this.options.xInterval*.8);
						ctx.lineWidth = linewidth;
						var points = this.tableData.getMembers()[h].points;
						var prevPoints = [];
						if(this.tableData.getMembers()[h+1]){
							prevPoints = this.tableData.getMembers()[h+1].points;
						}
						var nextPrevPoints = [];
						if(this.tableData.getMembers()[h+2]){
							nextPrevPoints = this.tableData.getMembers()[h+2].points;
						}
						var integer = 0;
						
						for(var i=0; i<points.length; i++){
							var prevPoint = 0;
							var nextPrevPoint = 0;
							if(prevPoints[i]) prevPoint = prevPoints[i];
							if(nextPrevPoints[i]) nextPrevPoint = nextPrevPoints[i];
							
							ctx.moveTo(integer, 0);
							ctx.lineTo(integer,Math.round((-points[i] - prevPoint - nextPrevPoint)*this.options.yScale));
							integer+=this.options.xInterval;
						}
						
						ctx.strokeStyle = this.options.colors[h];
						ctx.stroke();
						ctx.closePath();
					}

				}
			break;
			case 'pie':

				var centerx = this.options.dimensions.width/2;
				var centery = this.options.dimensions.height/2;
				var radius =  this.options.dimensions.height/2-20;
				
				function toRad(integer){
					return (Math.PI/180)*integer;
				}

				ctx.clearRect(0,0, 1000, 1000);	
				ctx.save();	

				ctx.arc(centerx, centery, radius, toRad(0), toRad( 360), true);
				ctx.fillStyle = '#ccc';
				ctx.fill();
				//console.log('pie done: ', centerx,centery, radius);
				var counter = 0.0;

				var xLabelID = this.tableElement.get('id')+'_data';
				if ($(xLabelID)) $(xLabelID).dispose();
				
				this.xLabelsElement = new Element('ul', {
						id: xLabelID, 
						styles: {
							position:'absolute', 
							top: '-2.5em', 
							left: '-3em',
							listStyle: 'none'
						}	
					}).injectAfter(this.options.canvasElement);
	
				var total = this.tableData.getMemberTotals();
			
				for (i = 0; i<total.length; i++)
				{
					var fraction = total[i] / this.tableData.getDataSum();
					
						ctx.beginPath();
						ctx.moveTo(centerx, centery);
						ctx.arc(centerx, centery, radius, (counter * Math.PI * 2 - Math.PI * 0.5) , ((counter + fraction) * Math.PI * 2 - Math.PI * 0.5 ), false);
						ctx.lineTo(centerx, centery);
						ctx.closePath();
						ctx.fillStyle = this.options.colors[i];
						ctx.fill();

						//draw labels
						var sliceMiddle = (counter + fraction/2)
						var labelx = centerx + Math.sin(sliceMiddle * Math.PI * 2) * (radius/2);
						var labely = centery - Math.cos(sliceMiddle * Math.PI * 2) * (radius/2);
						//console.log(labelx, labely);
						new Element('li', { 
							html: Math.round(fraction*100)+'%', 
							styles: {
								color: '#000',
								backgroundColor: "rgba(255,255,255,0.8)",
								listStyle: 'none', 
								fontSize: '1.1em',
								fontWeight: 'bold',
								left: labelx, 
								top: labely,
								position: 'absolute'
							}
						}).injectInside(this.xLabelsElement);				
							 
					  counter+=fraction;
					 //console.log(counter);
				}					
				//end create pie
			break;
		}		

	},

	cleanUp: function() {
		this.canvasWrapper.dispose();

	}

});


var Chart = new Class({
	
	Implements: [Options, Events],
	initialize: function(parent, options)
	{
//		console.log('chart class initialized');

	}
});

Chart.Bar = new Class({

	Extends: Chart,

	initialize: function(parent, options) 
	{
//		console.log('chart.Bar initialized')
		
	}
});


//graph data from table function

TableData = new Class({
	Implements: [Options],
	options: {

	},
	tableObject: false,
	cachedData : {
		xLabels: false,
		members: false,
		topValue: false,
		yTotals: false
	},
	

	initialize: function(tableObject, options)
	{
		this.setOptions(options);
		this.tableObject = $(tableObject);
		
	},

	/* Gets the data from the table and sorts it already for cumulative totals. */
	getMembers: function() {
		if(!this.cachedData.members)
		{
			var members = [];
			this.tableObject.getElements('tbody tr').each(function(row, i) {
				members[i] = { 
					points: row.getElements('td').get('text'), 
					color: this.options.colors[i] 
				};				
				row.getElement('th').setStyle('backgroundColor', this.options.colors[i]);

				for(j=0; j<members[i].points.length; j++) {
					members[i].points[j] = parseInt(members[i].points[j]);
				}
			}, this);

			this.cachedData.members = members.sort(function(a,b) {
				var x = a.points;
				var y = b.points;
				var xSum = 0;
				var ySum = 0;
				for(i= 0; i<x.length; i++) { xSum += x[i]; }
				for(i=0; i<y.length; i++) { ySum += y[i]; }
				return ((xSum < ySum) ? -1 : ((xSum > ySum) ? 1 : 0));
			}).reverse();
		}
		return this.cachedData.members;
	},

	getAllData: function() {
		var allData = [];
		var members = this.getMembers();

		members.each(function(row) {
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
	
	getMemberTotals: function() {
		var memberTotals = new Array();
		members = this.getMembers().each(function(member){
			var count = 0;
			for(i=0; i<member.points.length; i++) {
				count += member.points[i];
			}
			memberTotals.push(count);
		});
		return memberTotals;
	},
		//todo
	getYTotals: function() {
		if(!this.cachedData.yTotals)
		{
			var yTotals = [];
			var members = this.getMembers();
			for(var i = 0; i< this.getXLabels().length; i++) 
			{
				yTotals[i] = 0;
				for(var j = 0; j< members.length; j++) 
				{
					yTotals[i] += members[j].points[i];
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

	getYLabelsAdditive: function(){
		var yLabelsAdditive = [];
		var chartHeight = this.options.dimensions.height;
		var numLabels = chartHeight / 30;
		var loopInterval = Math.round(this.getTopYtotal() / numLabels);

		for(var j=0; j<=numLabels; j++){
			yLabelsAdditive.push(j*loopInterval);
		}
		if(yLabelsAdditive[numLabels] != this.getTopYtotal()) {
			yLabelsAdditive.pop();
			yLabelsAdditive.push(this.getTopYtotal());
		}
		return yLabelsAdditive;
	}				
					
					
});//end graphData



Element.implement({
	
	toChart : function(options) 
	{
		//console.log('Element.toChart called : ', this, options);
		if(this.retrieve('chart'))
		{
			this.retrieve('chart').cleanUp();
		}
		//console.log('options: ', options);
		this.store('chart', new ChartThingy(this, options));			
	}

});

