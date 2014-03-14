$(document).ready(function(){
    var $list = $('#transactions tbody');
    var $out = $('#out tbody');
    var $flow = $('#flow tbody');
    pc = new PayController();
    pc.attach(function(a){
        var that = this;
        $list.empty();
        for(var i in a){
            var $to = $("<td>").text(a[i].to);
            var $from= $("<td>").text(a[i].from);
            var $value = $("<td>").attr('align','right').text(a[i].value.toFixed(2));
            var $description = $("<td>").text(a[i].description);
            var $row = $("<tr>").append($from, $to, $value, $description);
            $list.append($row);
        }
    },
    function(a){
        $out.empty();
        $flow.empty();
        var out = a.map(function(x){
            return [x.from, x.to, x.value];
        });
        if(out.length == 0){
            $out.append("<tr><td colspan='3'>No payments.</td></tr>");
            return;
        }
        try {
            var results = run(out);
            for(var row in results){
                var delta = results[row].value;
                var action;
                if(delta < 0){
                    action = "pays";
                }else{
                    action = "receives";
                }
                $flow.append("<tr><td>"+row+"</td><td align='right'>"+action+"</td><td align='right'>"+Math.abs(delta).toFixed(2)+"</td></tr>");
                if(!results[row].items.length){
                    continue;
                }
                var recipients = results[row].items.map(function(w){ return w.to; }).join("<br>");
                var values = results[row].items.map(function(w){ return w.value.toFixed(2); }).join("<br>");
                $out.append("<tr><td>"+row+"</td><td>"+recipients+"</td><td align='right'>"+values+"</td></tr>");
            }
            renderGraph();
        } catch(e) {
            $out.append("<tr><td colspan='3'>Payments contain a cycle!<br>"+e+"</td></tr>");
        }
    });
    pc.list(true);
});

function renderGraph(){
    // States and transitions from RFC 793
    var people = graphNodes.map(function(s) {
        return { id: s, value: { label: s } };
    });
    var edgesOriginal = graphEdges.map(function(s) {
        return { u: s[0], v: s[1], value: {label: (Math.round(s[2])+'') } };
    });
    
    var edgesOptimized = graphEdgesFinal.map(function(s) {
        return { u: s[0], v: s[1], value: {label: (Math.round(s[2])+'') } };
    });
    
    var layout = dagreD3.layout().rankDir('TB');
    var renderer1 = new dagreD3.Renderer();
    var g1 = renderer1.layout(layout).run(dagreD3.json.decode(people, edgesOriginal), d3.select(document.getElementById("original")));
    d3.select(document.getElementById("originalContainer"))
    .attr("width", g1.graph().width + 40)
    .attr("height", g1.graph().height + 40);
    
    var renderer2 = new dagreD3.Renderer();
    var g2 = renderer2.layout(layout).run(dagreD3.json.decode(people, edgesOptimized), d3.select(document.getElementById("optimized")));
    d3.select(document.getElementById("optimizedContainer"))
    .attr("width", g2.graph().width + 40)
    .attr("height", g2.graph().height + 40);
}
