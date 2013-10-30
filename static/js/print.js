$(document).ready(function(){
    var $list = $('#transactions tbody');
    var $out = $('#out tbody');
    pc = new PayController();
    pc.attach(function(a){
        var that = this;
        $list.empty();
        for(var i in a){
            var $to = $("<td>").text(a[i].recipient);
            var $from= $("<td>").text(a[i].sender);
            var $value = $("<td>").text(a[i].value.toFixed(2));
            var $description = $("<td>").text(a[i].description);
            var $row = $("<tr>").append($from, $to, $value, $description);
            $list.append($row);
        }
    },
    function(a){
        $out.empty();
        var out = a.map(function(x){
            return [x.sender, x.recipient, x.value];
        });
        try {
            var results = run(out);
            if(results.length == 0){
                $out.append("<tr><td colspan='3'>No payments yet. Enter payments above!</td></tr>");
            }
            for(var i in results){
                $out.append("<tr><td>"+results[i][0]+"</td><td>"+results[i][1]+"</td><td>"+results[i][2]+"</td></tr>");
            }
        } catch(e) {
            $out.append("<tr><td colspan='3'>Payments contain a cycle!<br>"+e+"</td></tr>");
        }
    });
    pc.list(true);
});