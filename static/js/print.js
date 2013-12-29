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
        } catch(e) {
            $out.append("<tr><td colspan='3'>Payments contain a cycle!<br>"+e+"</td></tr>");
        }
    });
    pc.list(true);
});