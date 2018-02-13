d3.json("data/data.json", function(result){
 	
	if (!result || !result.data)
		return;
	
		console.log(result)
	
	var 
		data = result.data,
		target = d3.select("#vis"),
		svg,
		flowsGroup,
		width,
		height,
		loop = false,
		
		regions = [],
		regionsData,
		year = '2000',
		regionMoving = null,
		expanded = false;
		
		// params
		regionRadius = 90,
		regionStrokeWidth = Math.round(regionRadius/2.5),
		regionMargin = 50,
		regionTolerance = 50,
		regionDistance = regionRadius * 2 + regionMargin;
		
		// transition
		regionRadiusDuration = 300
		
		// scales
		regionAngle = d3.scale.linear(),
		regionPopulation = d3.scale.linear(),
		regionConsumption = d3.scale.linear(),
		regionFlow = d3.scale.linear(),

		// others
	    arc = d3.svg.arc(),
		line = d3.svg.line()
			.interpolate('bundle')
			.tension(1)
			

	if (!width || !height){
		width = parseInt(target.style("width"))
		height = parseInt(target.style("height"))
	}

	// init svg
	svg = target
		.append("svg")
		.attr("width", width)
		.attr("height", height)
	
	var grad = svg.append("svg:defs")
		.append("svg:radialGradient")
		.attr("id","grad")
		.attr("cx","50%")
		.attr("cy","50%")
		.attr("r","50%")
		.attr("fx","50%")
		.attr("fy","30%")
	
	grad.append("stop")
		.attr("offset","0%")
		.attr("stop-color","rgb(255,255,255)")
		.attr("stop-opacity","1")
		
	grad.append("stop")
		.attr("offset","100%")
		.attr("stop-color","#f8f8f8")
		.attr("stop-opacity","1")	
		
	
	svg.append("svg:rect")
		.attr("width",width)
		.attr("height",height)
		.attr("fill","url(#grad)")
		.style("opacity",".5")
	
	flowsGroup = svg.append("svg:g")
	
	
		

	// update data
	updateRegionsData();
	
	// init regions
	regionsData.forEach( function(regionData, i ) {
		
		var region = {};
		
		region.data = regionData.value;
		region.name = regionData.key;
		
		region.isContained = i == 0 ? false : true;
		region.contains = i == regionsData.length-1 ? false : true;
		
		//region.x = i*(regionRadius * 2 + regionMargin)+((width-(regionsData.length-1)*(regionRadius * 2 + regionMargin))/2)
		region.x = width/2;
		region.y = Math.round(height/100*35);
		region.moving = false;
		
		region.g = svg.append("svg:g")
			.attr("class","region")
			.attr("transform", "translate(" + region.x + "," + region.y + ")" )
			.on("mouseover",function(d){
				d3.select(".region-trigger")
				.transition()
				.style("opacity",1)
				.style("cursor","pointer")
				console.log(region)
			})
			.on("mouseout",function(d){
				d3.select(".region-trigger")
				.transition()
				.style("opacity",0)
			})
			.on("click",function(d){
				region.handleExpand();
			})
				
		region.move = function(p){
			
			region.g.attr("transform", "translate(" + (d3.event.offsetX - p) + "," + region.y + ")" );
			region.x = d3.event.offsetX - p;
			region.grouped = false;
			if (region.next)
				region.next.move(p)			
		}
		
		region.moveTo = function(p){
			
			region.g.transition().duration(1000).attr("transform", "translate(" + p + "," + region.y + ")" );
			region.x = p;
			region.grouped = false;
			if (region.next)
				region.next.moveTo(p)
		}
	
		region.handleExpand = function(){
			
			// the region is 'under another'
			// let's move it and all the children
			if (region.isContained) {
				region.moveTo(regionDistance + region.x)
				region.isContained = false;
				if(region.prev) region.prev.contains = false;
			} else if (region.prev){
				region.moveTo(region.prev.x)
				region.isContained = true;
				region.prev.contains = true;
			}
			
			updateAll();
		}
			
		regions.push(region);
		
	});
	
	// generating next...
	for (var i = 0; i < regions.length-1; i++){
		regions[i].next = regions[i+1];
	}
	// ...and prev
	for (var i = 1; i < regions.length; i++){
		regions[i].prev = regions[i-1];
	}
	
	
	// drawing regions
	regions.forEach( function(region, i ) {		
				
		region.update = function(){ 
			
			var contained = regions.filter(function(d){return !d.isContained; })
			
			contained.forEach(function(d, n){
				if (d.name == region.name) {
					region.moveTo(n * regionDistance + ( (width-(contained.length-1) * regionDistance )/2));
				}				
			})
			
			
			region.label = findNextNotContained(region) != null ? " (w/ \n" + capitalise(findNextNotContained(region).name) +")" : "";			
			
			region.g
				.transition()
				.attr("transform", "translate(" + region.x + "," + region.y + ")" )
			
			region.g.selectAll("*")
				.remove()
			
			// base
			region.g.append("svg:circle")
				.attr("class", "region-base")
				.attr("r", 0)
				.attr("stroke-width", 1)
				.attr("stroke-dasharray","5,5")
				//.transition()
					.attr("r", regionRadius+regionStrokeWidth/2)
				//	.duration(regionRadiusDuration)
	
			// population 
			region.g.append("svg:path")
				.attr("class", "region-population")
				.attr("fill", "#aaa")
				.attr("stroke","#f8f8f8")
				.attr("stroke-width",1)
				.attr("fill-rule","evenodd")
				.attr("opacity",0)
//				.transition()
				.attr("opacity",1)
			    .attr("d", function(d){
				
					var radiusOffset = Math.PI/2 - regionAngle(region.data.population)/2
					var currentArc = {
						innerRadius : regionRadius - regionStrokeWidth/2,
						outerRadius : regionRadius + regionStrokeWidth/2,
						startAngle : radiusOffset,
						endAngle : radiusOffset+regionAngle(region.data.population)
					}
			
					if (!region.next)
						return arc(currentArc);
				
					radiusOffset = Math.PI/2 - regionAngle(region.next.data.population)/2
					var nextArc = {
						innerRadius : regionRadius - regionStrokeWidth/2,
						outerRadius : regionRadius + regionStrokeWidth/2,
						startAngle : radiusOffset,
						endAngle : radiusOffset+regionAngle(region.next.data.population)
					}
					return arc(currentArc) + " " + arc(nextArc);				
			    })
				.attr("data-mouseover", function(){ return capitalise(region.name) })
				.on("mouseover", mouseover)
				.on("mousemove", mousemove)
				.on("mouseout", mouseout);
		
			// stock 
			region.g.append("svg:path")
				.attr("class", "region-stock")
				.attr("fill", "#000")
		//		.attr("stroke","#eee")
		//		.attr("stroke-width",1)		
				.attr("fill-rule","evenodd")
				.attr("opacity",0)
				.transition()
				.attr("opacity",1)
			    .attr("d", function(d){
				
					var radiusOffset = Math.PI/2 - regionAngle(region.data.population)/2
					var currentArc = {
						innerRadius : regionRadius - regionStrokeWidth/2,
						outerRadius : regionRadius - regionStrokeWidth/2 + 10,
						startAngle : radiusOffset,
						endAngle : radiusOffset+regionAngle(region.data.population)
					}
			
					if (!region.next)
						return arc(currentArc);
				
					radiusOffset = Math.PI/2 - regionAngle(region.next.data.population)/2
					var nextArc = {
						innerRadius : regionRadius - regionStrokeWidth/2,
						outerRadius : regionRadius - regionStrokeWidth/2 + 10,
						startAngle : radiusOffset,
						endAngle : radiusOffset+regionAngle(region.next.data.population)
					}

					return arc(currentArc) + " " + arc(nextArc);				

			    })
	
			// main label	
			region.g.append("svg:text")
				.attr("class","region-title")
				.attr("dy","-2px")
				.attr("text-anchor","middle")
			.text(function(){
				return region.isContained ? "" : capitalise(region.name);
			})
			
			// sub label	
			region.g.append("svg:text")
				.attr("class","region-subtitle")
				.attr("dy","15px")
				.attr("text-anchor","middle")
			.text(function(){
				return region.isContained ? "" : capitalise(region.label);
			})
		
		}
		
		
	
	
		/* trigger
		region.g.append("svg:circle")
			.attr("class", "region-trigger")
			.attr("r", 0)
			.attr("stroke-width", 0)
			.attr("opacity",0)
			.transition()
				.attr("r", regionRadius+regionStrokeWidth/2 + 10)
				.duration(regionRadiusDuration)
		*/
		
		region.update();
				
	});
	
	exchangeGroup = svg.append("svg:g")
	
	updateFlows();
	
	d3.selectAll("#choose-year .btn-year")
		.on("click",function(){
			year = d3.event.target.value
			
			// clear loop
			loop = false;
			d3.select(".btn-time")
				.attr("class","btn btn-small btn-time")
			updateAll();
		
		})
	
	
	d3.select(".btn-time")
		.on("click",function(){
			
			loop = !loop;
			var timer = setInterval(func, 2000);
			
			function func(){
				
				if (loop) {					
					var years = d3.selectAll("#choose-year .btn-year")[0].map(function(d){return d3.select(d).property("value")})
					var count = years.indexOf(year);
					if (count==years.length-1)
						count = -1;
					count++;
					year = years[count];
					d3.selectAll("#choose-year .btn-year")[0].forEach(function(d){
						d3.select(d).attr("class", d3.select(d).property("value") == year ? "btn btn-small btn-year active" : "btn btn-small btn-year")
					})
					
					updateAll();
				}
				else {
					clearInterval(timer);
				}
				
			}
			
			
		})
		
	d3.selectAll(".btn-expand")
		.on("click",function(){
			expanded = !expanded;
			regions.forEach(function(d){
				d.isContained = expanded;
				d.handleExpand()
			});
			
			d3.select(this)
				.text(function(d){
					return expanded? "Shrink all" : "Expand all";
				});
			
			/*regions.forEach(function(d){
				d.isContained = expanded;
			})
			updateAll();*/
		})
	
	function findNextNotContained(d){
		
		if (!d.next)
			return null;
		
		if (d.next.isContained == false)
			return d.next;
		
		return findNextNotContained(d.next)
	}
	
	function updateAll(){
		
		updateRegionsData();
		
		regions.forEach(function(d,i){
			d.data = regionsData[i].value;			
		})
		
		regions.forEach(function(d,i){
			d.update();			
		})
		updateFlows();
		
		
	}
	
	
	function regionByName(name){
		var region = false;
		regions.forEach(function(d){
			if (d.name == name)
				region = d;
		})
		return region;
	}
	
	
	function capitalise(string){
		return string.charAt(0).toUpperCase() + string.slice(1);
	}
	
	function updateRegionsData(){
		
		regionsData = d3.entries(data[year]);
		regionsData.sort(function(a,b){ return a.value.population <= b.value.population; })
						
		regionAngle.domain([
			d3.min(regionsData.map(function(d){ return d.value.population; })),
			d3.max(regionsData.map(function(d){ return d.value.population; }))
		]).range([0.02, Math.PI*2])
		
		regionPopulation.domain([
			d3.min(regionsData.map(function(d){ return d.value.population; })),
			d3.max(regionsData.map(function(d){ return d.value.population; }))
		]).range([0.5,50])
		
		regionConsumption.domain([
			d3.min(regionsData.map(function(d){ return d.value.consumption; })),
			d3.max(regionsData.map(function(d){ return d.value.consumption; }))
		]).range([1,50])
		
		
		// sky and soil have to be combined...
		ranges = regionsData.map(function(d){ return d.value.sky; })
		ranges.concat(regionsData.map(function(d){ return d.value.subsoil; }))
		
		regionFlow.domain([
			d3.min(ranges),
			d3.max(ranges)
		]).range([1,50])
		
		
	
	}
	
		
	function curve(s, d) {
				
		var points = [
			[ s.x, s.y ],
			[ s.x, s.y+50 ],
			[ d.x, d.y-outerRadius/2-50 ],
			[ d.x, d.y-outerRadius/2 ]
		]
		
		return line(points)
	}
	
	svg.append("svg:text")
		.attr("class","flow-title")
		.attr("dx", (width/2)+"px")
		.attr("dy", "70px")
		.attr("text-anchor","middle")
		.text("Sky vector")
	
	
	svg.append("svg:text")
		.attr("class","flow-title")
		.attr("dx", width/2+"px")
		.attr("dy", height/100*55+20+"px")
		.attr("text-anchor","middle")
		.text("Subsoil vector")

	svg.append("svg:text")
		.attr("class","flow-title")
		.attr("dx", width/2+"px")
		.attr("dy", height-130+"px")
		.attr("text-anchor","middle")
		.text("Consumption vector")

	//sky marker
	svg.append("svg:defs")
		.append("svg:marker")
		.attr("id","sky-marker")
		.attr("viewBox","0 0 5 10")
		.attr("refX","0")
		.attr("refY","5")
		.attr("markerUnits","strokeWidth")
		.attr("markerWidth","1")
		.attr("markerHeight","1.6")
		.attr("orient","90")
		.append("svg:path")
			.attr("d","M 0 0 L 2 5 L 0 10 z")
			.attr("fill","#2FB2E0")
	
	//subsoil marker
	svg.append("svg:defs")
		.append("svg:marker")
		.attr("id","subsoil-marker")
		.attr("viewBox","0 0 5 10")
		.attr("refX","0")
		.attr("refY","5")
		.attr("markerUnits","strokeWidth")
		.attr("markerWidth","2")
		.attr("markerHeight","2")
		.attr("orient","-90")
		.append("svg:path")
			.attr("d","M 0 0 L 2 5 L 0 10 z")
			.attr("fill","#DBD628")
	
	//consumption marker
	svg.append("svg:defs")
		.append("svg:marker")
		.attr("id","consumption-marker")
		.attr("viewBox","0 0 5 10")
		.attr("refX","0")
		.attr("refY","5")
		.attr("markerUnits","strokeWidth")
		.attr("markerWidth","1")
		.attr("markerHeight","1.3")
		.attr("orient","90")
		.append("svg:path")
			.attr("d","M 0 0 L 2 5 L 0 10 z")
			.attr("fill","#BFBFBF")
	
	//exchange marker
	svg.append("svg:defs")
		.append("svg:marker")
		.attr("id","exchange-marker")
		.attr("viewBox", "0 -5 10 10")
		    .attr("refX", .5)
		    .attr("refY", 0)
		    .attr("markerWidth", 1)
		    .attr("markerHeight", 1)
		    .attr("orient", "auto")
		  .append("svg:path")
		    .attr("d", "M0,-5L10,0L0,5")
			.attr("fill","#888");
		
	function updateFlows(){
		
		var last = -d3.sum(regions,function(d){ return regionFlow(d.data.sky); })/2;

		// make the flows smoooooth
		lastTarget = {}
		regions.forEach(function(t){ 
			var lastTargetPoint = t.x.toString().concat(t.y.toString());
			if (!lastTarget.hasOwnProperty(lastTargetPoint))
				lastTarget[lastTargetPoint] = 0;
			lastTarget[lastTargetPoint] -= regionFlow(t.data.sky)/2;
		})

		// sky
		flowsGroup.selectAll("path.sky")
			.remove();
				
		flowsGroup.selectAll("path.sky")
			.data(regions).enter()
			.append("svg:path")
				.attr("class","sky flow")
				.style("stroke","#2FB2E0")
				.attr("stroke-width", function(d){ return regionFlow(d.data.sky); })
				.attr("d", function(t){
					
					// a unique position
					var lastTargetPoint = t.x.toString().concat(t.y.toString());

					// source point
					s = { x : width/2, y:80};

					var targetOffset = 0;
					
					var points = [
						[ s.x+last+regionFlow(t.data.sky)/2, s.y ],
						[ s.x+last+regionFlow(t.data.sky)/2, s.y+height/100*35/6 ],
						[ t.x+lastTarget[lastTargetPoint]+regionFlow(t.data.sky)/2, t.y-regionRadius-regionMargin-height/100*35/6 + targetOffset ],
						[ t.x+lastTarget[lastTargetPoint]+regionFlow(t.data.sky)/2, t.y-regionRadius-regionMargin + targetOffset ]
					]
					
					last += regionFlow(t.data.sky);
					lastTarget[lastTargetPoint] += regionFlow(t.data.sky);
					
					return line(points)
				})
				.attr("marker-end","url(#sky-marker)")
				.attr("title", function(d){
					return capitalise(d.name) + " (sky): " + d.data.sky;
				})
				.attr("data-mouseover", function(d){ return "<b>Sky vector</b><br/>" + capitalise(d.name) + capitalise(d.label) + "<br/>" + d.data.sky + "" })
				.on("mouseover", mouseover)
				.on("mousemove", mousemove)
				.on("mouseout", mouseout);
			
						
				
		//subsoil
		last = -d3.sum(regions,function(d){ return regionFlow(d.data.subsoil); })/2;
		
		// make the flows smoooooth
		lastTarget = {}
		regions.forEach(function(t){ 
			var lastTargetPoint = t.x.toString().concat(t.y.toString());
			if (!lastTarget.hasOwnProperty(lastTargetPoint))
				lastTarget[lastTargetPoint] = 0;
			lastTarget[lastTargetPoint] -= regionFlow(t.data.subsoil)/2;
		})		
		
		flowsGroup.selectAll("path.subsoil")
			.remove()
			
		flowsGroup.selectAll("path.subsoil")
			.data(regions).enter()
			.append("svg:path")
				.attr("class","subsoil flow")
				.style("stroke","#DBD628")
				.attr("stroke-width", function(d){ return regionFlow(d.data.subsoil); })
				.attr("d", function(t){ 
					
					// a unique position
					var lastTargetPoint = t.x.toString().concat(t.y.toString());

					s = { x:width/2, y:height/100*55 };
					var points = [
						[ s.x+last+regionFlow(t.data.subsoil)/2, s.y ],
						[ s.x+last+regionFlow(t.data.subsoil)/2, s.y-height/100*35/6 ],
						[ t.x+lastTarget[lastTargetPoint]+regionFlow(t.data.subsoil)/2, t.y+regionRadius/3+height/100*35/6 ],
						[ t.x+lastTarget[lastTargetPoint]+regionFlow(t.data.subsoil)/2, t.y+regionRadius/3 ]
					]
					last += regionFlow(t.data.subsoil);
					lastTarget[lastTargetPoint] += regionFlow(t.data.subsoil);
					
					return line(points)
				})
				.attr("marker-end","url(#subsoil-marker)")
				.attr("title", function(d){
					return capitalise(d.name) + " (subsoil): " + d.data.subsoil;
				})
				.attr("data-mouseover", function(d){ return "<b>Subsoil vector</b><br/>" + capitalise(d.name) + capitalise(d.label) + "<br/>" + d.data.subsoil + "" })
				.on("mouseover", mouseover)
				.on("mousemove", mousemove)
				.on("mouseout", mouseout);
				
		//consumption
		last = -d3.sum(regions,function(d){ return regionConsumption(d.data.consumption); })/2;
		
		// make the flows smoooooth
		lastTarget = {}
		regions.forEach(function(t){ 
			var lastTargetPoint = t.x.toString().concat(t.y.toString());
			if (!lastTarget.hasOwnProperty(lastTargetPoint))
				lastTarget[lastTargetPoint] = 0;
			lastTarget[lastTargetPoint] -= regionConsumption(t.data.consumption)/2;
		})		
		
		flowsGroup.selectAll("path.consumption")
			.remove()
			
		flowsGroup.selectAll("path.consumption")
			.data(regions).enter()
			.append("svg:path")
				.attr("class","consumption flow")
				.style("stroke","#BFBFBF")
				.attr("stroke-width", function(d){ return regionConsumption(d.data.consumption); })
				.attr("d", function(t){ 

					// a unique position
					var lastTargetPoint = t.x.toString().concat(t.y.toString());

					s = { x:width/2, y:height-180 };
					var points = [
						[ s.x+last+regionConsumption(t.data.consumption)/2, s.y ],
						[ s.x+last+regionConsumption(t.data.consumption)/2, s.y-70 ],
						[ t.x+lastTarget[lastTargetPoint]+regionConsumption(t.data.consumption)/2, t.y+regionRadius*2+150 ],
						[ t.x+lastTarget[lastTargetPoint]+regionConsumption(t.data.consumption)/2, t.y+regionRadius*2+80 ]
					]
					last += regionConsumption(t.data.consumption);
					lastTarget[lastTargetPoint] += regionConsumption(t.data.consumption);
					
					
					return line(points)
				})
				//.attr("marker-start","url(#consumption-marker)")
				.attr("title", function(d){
					return capitalise(d.name) + " (subsoil): " + d.data.consumption;
				})
				.attr("data-mouseover", function(d){ return "<b>Consumption vector</b><br/>" + capitalise(d.name) + capitalise(d.label) + "<br/>" + d.data.consumption + "" })
				.on("mouseover", mouseover)
				.on("mousemove", mousemove)
				.on("mouseout", mouseout);
				
		
		// trick per unica freccia consumption
		flowsGroup.append("svg:path")
			.attr("d", "M " + (width/2) + " " + (height-180) + " L " + (width/2) + " " + (height-181) + " z" ) //d="M 100 100 L 300 100 L 200 300 z"
			.style("stroke","#BFBFBF")
			.attr("stroke-width", function(){return d3.sum(regions,function(d){ return regionConsumption(d.data.consumption); })})
			.attr("marker-start","url(#consumption-marker)")
		
		
		exchangeGroup.selectAll("g.exchange")
			.remove()
		
		regions.forEach(function(r){
			
			var regionGroup = exchangeGroup.append("svg:g")
				.attr("class","exchange")
			
			regionGroup.selectAll("path.exchange")
				.data(d3.entries(r.data.exchange).filter(function(f){ return f.value != null && f.value >0; })).enter()
				.append("svg:path")
					.attr("class","exchange flow")
					.style("stroke","#888")
					.attr("opacity",.1)
					.attr("stroke-width", function(d){ console.log(d.value); return regionFlow(d.value)*10; })
					.attr("d", function(d){ 
						targetRegion = regionByName(d.key);

						t = {x:targetRegion.x, y:targetRegion.y};

						s = { x:r.x, y:r.y };
						
						if (s.x < t.x) {
							s.y -= regionRadius+regionStrokeWidth;
							t.y -= regionRadius+regionStrokeWidth;
						}
						else {
							s.y += regionRadius+regionStrokeWidth;
							t.y += regionRadius+regionStrokeWidth;
						}
						
						
						var dx = t.x - s.x,
							dy = t.y - s.y,
							dr = Math.sqrt(dx * dx + dy * dy);
						return "M" + s.x + "," + s.y + "A" + dr + "," + dr + " 0 0,1 " + t.x + "," + t.y;
						
					})
					.attr("marker-end","url(#exchange-marker)")
					.attr("data-mouseover", function(d){ return "<b>Exchange vector</b><br/>" + capitalise(r.name) + capitalise(r.label) + "<br/>" + capitalise(d.key) + "<br/>" + d.value })
					.on("mouseover", mouseover)
					.on("mousemove", mousemove)
					.on("mouseout", mouseout);
		})
		
		
	
	}
	
})



var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 1e-6);
		
function mouseover() {
  div.transition()
      .duration(300)
      .style("opacity", .95);
}

function mousemove() {
	var text = d3.select(d3.event.target).attr("data-mouseover");
	
	div
      .html(text)
	div
	.style("left", (d3.event.pageX - div.property("offsetWidth")/2) + "px")
      .style("top", (d3.event.pageY) + "px");
}

function mouseout() {
  div.transition()
      .duration(300)
      .style("opacity", 1e-6);
}

			
			
/*
.on("mousedown",function(){
	region.moving = true;
	region.lastX = d3.event.offsetX - region.x;		
	regionMoving = region;
})
			
svg.on("mouseup",function(){
	// enable moving
	region.moving = false;
	regionMoving = null;
})
			
svg.on("mousemove", function(){
				
	if (!regionMoving)
		return;
	regionMoving.move(regionMoving.lastX);
});
		
*/

