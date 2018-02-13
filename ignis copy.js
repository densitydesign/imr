/*
 * DensityDesign Lab
 */

var ig = {};


d3.json("data/data.json", function(result){
	
 	data = result.data;
 	ig = ignis.vis()
 		.data(data)
		.target("#vis")
		.year("1950")
 		.update()	
	
})


d3.selectAll("#choose-year .btn")
	.on("click",function(){
		console.log(ig)
		ig.year(d3.event.target.value)
			.update();
		
	})


function capitalise(string){
	return string.charAt(0).toUpperCase() + string.slice(1);
}


// some params
var skyColor = "#00BBDF",
	soilColor = "#DDB800",
	consumptionColor = "#888888",
	distance = 350,
	opens = 0,
	radius = 0;


/* Main vis */
var ignis = {}

ignis.debug = true;
	
ignis.log = function(){
	if (ignis.debug) for (var b in arguments) console.log("[Ignis]",arguments[b]);
	else for (b in arguments) throw Error(arguments[b]);
	return ignis;
}


ignis.level = function(){
	
	var level = {},
		svg,
		data,
		target,
		open = true,
		center,
		angle,
		size,
	    arc = d3.svg.arc(),
	    donut = d3.layout.pie().sort(null),
		radius,
		event = d3.dispatch(
			"click",
			"startDrag",
			"stopDrag"
		)
		
	level.data = function(x){
		if (!arguments.length) return data;
		x.level = level;
		data = x;
		return level;
	}
	
	level.target = function(x){
		if (!arguments.length) return target;
		target = typeof x == "object" ? x : d3.select(x);
		return level;
	}
		
	level.center = function(x){
		if (!arguments.length) return center;
		center = x;
		data.x = center[0]
		data.y = center[1]
		return level;
	}

	level.angle = function(x){
		if (!arguments.length) return angle;
		angle = x;
		return level;
	}
		
	level.size = function(x){
		if (!arguments.length) return size;
		size = x;
		return level;
	}
	
	level.radius = function(x){
		if (!arguments.length) return radius;
		radius = x;
		return level;
	}
	
	level.on = function(type, listener) {
		event.on(type,listener)
		return level;
	}
	
	level.x = function() {
		return data.x;
	}
	
	level.y = function() {
		return data.y;
	}
	
	
	level.move = function(x,y,callback){
		
		svg.transition()
			.attr("transform", "translate("+x+","+y+")")
			.each("end",callback)
		data.x = x;
		data.y = y;
		
		if (data.next){
			data.next.value.level.move(x,y);
		}		
		
		// next = next + new of this
		
	}
		
	level.update = function(){

		
		svg = target.append("svg:g")
			.data([data])
			.attr("class", "level")
			.attr("transform",function(d,i){
				return "translate(" + center[0] + "," + center[1] + ")";
			})
			.on("click",function(){
				event.click(level);
				d3.event.offsetX			
			})
			.on("mousedown",function(){
				v = this;
				offsetX = d3.event.offsetX-center[0]
				offsetY = d3.event.offsetY-center[1]
				
				/*
				target
				.on("mousemove",function(){
					startDrag(offsetX,offsetY);
				})
				.on("mouseup",function(){
					target.on("mousemove", null)
					event.stopDrag(this);
				})
				*/
				
			})
			
			
		svg.append("svg:text")
		.attr("dy", -20+"px")
			.attr("class","title")
			.attr("text-anchor","middle")
			.text(function(){return capitalise(data.name);})	
		
		
		
		
		function startDrag(a,b){
			svg
				.attr("transform",function(d){return "translate(" + (d3.event.offsetX -a)+ "," + center[1] + ")"})
			center = [(d3.event.offsetX-a), center[1]]
			data.x = center[0]
			data.y = center[1]
			event.startDrag(v);
		}
			
		// un cerchio sotto tutto va
		svg.append("svg:circle")
			.attr("class","level-background")
			.attr("r", radius-15)
			.attr("stroke-width",30)
			.attr("cx", 0)
			.attr("cy", 0)			
		
		
		
		// il vero arco
		svg.append("svg:g")
			.attr("class","arc")
				.append("path")
			    .attr("fill", "#aaa")
			//	.attr("stroke", "#fff")
			    .attr("d", function(d){
			    	obj = {
						innerRadius : radius * .7,
						outerRadius : radius,
						startAngle : 0,
						endAngle : angle(data.population)
			    	}
					return arc(obj);				
			    })
				.attr("transform", function(d){
					return "rotate("+ (90 - angle(data.population) * 180/Math.PI / 2) +")";
				})
				.attr("rel","tooltip")
				.attr("title", function(){
					return capitalise(data.name) + " (population): " + data.population;
				})
			
		
		
		
		svg.append("svg:g")
			.attr("class","mask")
		  .append("path")
		    .attr("fill", "#f4f4f4")
			.attr("stroke", "#f4f4f4")
			.attr("stroke-width", "2px")
		    .attr("d", function(d){
		    	if (!data.next) return;
				obj = {
					innerRadius : radius * .7,
					outerRadius : radius,
					startAngle : 0,
					endAngle : angle(data.next.value.population)
		    	}
				return arc(obj);				
		    })
			.attr("transform", function(d){
				if (!data.next) return;
				return "rotate("+ (90 - angle(data.next.value.population) * 180/Math.PI / 2) +")";
			})
			
		return level;	
			
	}
	
	return level;
	
}


ignis.vis = function(){
			
	var vis = {},
		svg,
		data,
		year,
		scales,
		target,
		width,
		height,
		padding = 20,
		// Population
		population = d3.scale.linear(),
		// Consumption
		consumption = d3.scale.linear(),
		// Sky
		flow = d3.scale.linear(),
		// arcs
	    arc = d3.svg.arc(),
	    donut = d3.layout.pie().sort(null),
		innerRadius,
		outerRadius,
		angle = d3.scale.linear(),
		line = d3.svg.line()
			.interpolate('bundle')
			.tension(1)
		
	function curve(s, d) {
				
		var points = [
			[ s.x, s.y ],
			[ s.x, s.y+50 ],
			[ d.x, d.y-outerRadius/2-50 ],
			[ d.x, d.y-outerRadius/2 ]
		]
		
		return line(points)
	}
	
		
	
	vis.data = function(x){
		if (!arguments.length) return data;
		data = x;
		return vis;
	}
	
	vis.target = function(x){
		if (!arguments.length) return target;
		target = d3.select(x);
		return vis;
	}
	
	vis.year = function(x){
		if (!arguments.length) return year;
		year = parseInt(x);
		updateValues();
		return vis;
	}
	
	
	function updateValues(){
		
		scales = d3.entries(data[year]);
		scales.sort(function(a,b){ return a.value.population <= b.value.population; })
		
		// next...
		for (var i = 0; i<scales.length-1; i++){
			scales[i].value.next = scales[i+1];
		}
		// ...and prev
		for (var i = 1; i<scales.length; i++){
			scales[i].value.prev = scales[i-1];
		}
				
		angle.domain([
			d3.min(scales.map(function(d){ return d.value.population; })),
			d3.max(scales.map(function(d){ return d.value.population; }))
		]).range([0.02, Math.PI*2])		
		
		population.domain([
			d3.min(scales.map(function(d){ return d.value.population; })),
			d3.max(scales.map(function(d){ return d.value.population; }))
		]).range([0.5,50])
		
		consumption.domain([
			d3.min(scales.map(function(d){ return d.value.consumption; })),
			d3.max(scales.map(function(d){ return d.value.consumption; }))
		]).range([1,50])
		
		
		// sky and soil have to be combined...
		ranges = scales.map(function(d){ return d.value.sky; })
		ranges.concat(scales.map(function(d){ return d.value.subsoil; }))
		
		flow.domain([
			d3.min(ranges),
			d3.max(ranges)
		]).range([1,50])
		
		
		
	}
	
	vis.update = function(){
		
		if (!data || !target) return ignis.log("Data and Target are needed.") ;		
		
		if (!width || !height){
			width = parseInt(target.style("width"))
			height = parseInt(target.style("height"))
		}
		
		if (!year || !data[year]) {
			year = d3.keys(data)[0]
			updateValues();
		}
		
		outerRadius = width/4 - padding;//width/(scales.length)/2 - padding;
		innerRadius = outerRadius * .7;

		target.selectAll('svg').remove()
				
		svg = target.append("svg:svg")
		    .attr("width", width)
		    .attr("height", height)
			
		
		scales.forEach(function(d,i){
			
			d.value.name = d.key;
			
			var l = ignis.level()
				.data(d.value)
				.target(svg)
				.center([i*outerRadius+((width-(scales.length-1)*outerRadius)/2), height/2])
			//	.center([width/2, height/2])
				.radius(100)
				.angle(angle)
				.size(population)
				.on("startDrag",function(d){
					console.log("adasdasd",d)
					//updateFlows()
				})
			/*	.on("click",function(d){
					data = d.data()
					
					if (!data.open){
						opens++;
						d.move(data.x+distance, data.y,updateFlows)
						data.open = true;
					}
					else {
						opens--;
						d.move( data.x-distance, data.y,updateFlows)
						data.open = false;
					}
					
					
										
				})*/
				.update()
			
			l.data().open = false;
		
		})
		
		svg.on("mousemove",function(){
			
			console.log(d3.event.offsetX,d3.event.pageX)
			d3.select(".tooltip")
				.style("left",(d3.event.offsetX+50)+"px")
				.style("top",(d3.event.pageY-50)+"px")			
		})
		
		updateFlows();
		
		return vis;	
	}
	
	function updateFlows(){
		
		//last = 0;
		last = -d3.sum(scales,function(d){ return flow(d.value.sky); })/2;
		// sky
		svg.selectAll("path.sky")
			.remove();
		
		svg.append("svg:text")
			.attr("class","big-title")
			.attr("dx", width/2+"px")
			.attr("dy", "70px")
			.attr("text-anchor","middle")
			.text("Sky vector")
		
		svg.selectAll("path.sky")
			.data(scales).enter()
			.append("svg:path")
				.attr("class","sky flow")
				.style("stroke",skyColor)
				.attr("stroke-width", function(d){ return flow(d.value.sky); })
				.attr("d", function(t){

					d = t.value;
					s = {x:width/2,y:80};
					var points = [
						[ s.x+last+flow(t.value.sky)/2, s.y ],
						[ s.x+last+flow(t.value.sky)/2, s.y+80 ],
						[ d.x, d.y-outerRadius/2-80 ],
						[ d.x, d.y-outerRadius/2 ]
					]
					last += flow(t.value.sky);
					
					return line(points)
				})
				.attr("rel","tooltip")
				.attr("title", function(d){
					return capitalise(d.key) + " (sky): " + d.value.sky;
				})
				.on("mouseover",function(){
					d3.select(this).style("stroke",d3.rgb(skyColor).darker())
				})
				.on("mouseout",function(){
					d3.select(this).style("stroke",skyColor)
				})
		
		
		//consumption
		last = -d3.sum(scales,function(d){ return consumption(d.value.consumption); })/2;
		
		svg.selectAll("path.consumption")
			.remove()
		
		svg.append("svg:text")
			.attr("class","big-title")
			.attr("dx", width/2+"px")
			.attr("dy", height-70+"px")
			.attr("text-anchor","middle")
			.text("Consumption")
		
		svg.selectAll("path.consumption")
			.data(scales).enter()
			.append("svg:path")
				.attr("class","consumption flow")
				.style("stroke",consumptionColor)
				.attr("stroke-width", function(d){ return consumption(d.value.consumption); })
				.attr("d", function(t){ 
					d = t.value;
					s = { x:width/2, y:height-100 };
					var points = [
						[ s.x+last+consumption(t.value.consumption)/2, s.y ],
						[ s.x+last+consumption(t.value.consumption)/2, s.y-80 ],
						[ d.x, d.y+outerRadius/2+80 ],
						[ d.x, d.y+outerRadius/2 ]
					]
					last += consumption(t.value.consumption);
					return line(points)
				
				})
				.attr("rel","tooltip")
				.attr("title", function(d){
					return capitalise(d.key) + " (consumption) : " + d.value.consumption;
				})
				.on("mouseover",function(){
					d3.select(this).style("stroke",d3.rgb(consumptionColor).darker())
				})
				.on("mouseout",function(){
					d3.select(this).style("stroke",consumptionColor)
				})
				
				
		
		//subsoil
		svg.selectAll("path.subsoil")
			.remove()
		svg.selectAll("path.subsoil")
			.data(scales.sort(function(a,b){ return a.value.population >= b.value.population; })).enter()
			.append("svg:path")
				.attr("class","subsoil flow")
				.style("stroke",soilColor)
				.attr("stroke-width", function(d){ return flow(d.value.subsoil); })
				.attr("d", function(t){ 
					d = t.value;
					s = { x:d3.last(scales).value.x, y:height/2 };
					var points = [
						[ s.x, s.y ],
						[ s.x, s.y ],
						[ d.x+innerRadius/2, d.y ],
						[ d.x+innerRadius/2, d.y ]
					]
					return line(points)
				})
				.attr("rel","tooltip")
				.attr("title", function(d){
					return capitalise(d.key) + " (subsoil): " + d.value.subsoil;
				})
				.on("mouseover",function(){
					d3.select(this).style("stroke",d3.rgb(soilColor).darker())
				})
				.on("mouseout",function(){
					d3.select(this).style("stroke",soilColor)
				})
				
		// init tooltips
		$('[rel="tooltip"]').mouseover(function(event){
			$(event.target).tooltip("show");
		})
		
		return vis;
	}
			
	return vis;			
			
}
		



