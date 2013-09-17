$(document).ready(function(){
    var $list = $('#transactions tbody');
    var $out = $('#out tbody');
    pc = new PayController();
    pc.attach(function(a){
        var that = this;
        $list.empty();
        var out = [];
        var entities = {};
        for(var i in a){
            var $to = $("<td>").text(a[i].recipient);
            var $from= $("<td>").text(a[i].sender);
            var $value = $("<td>").text(a[i].value);
            var $description = $("<td>").text(a[i].description);
            var $row = $("<tr>").append($from, $to, $value, $description);
            $list.append($row);
            out.push([a[i].sender, a[i].recipient, a[i].value]);
        }
        $out.empty();
        try {
            var results = run(out);
            if(results.length == 0){
                $out.append("<tr><td colspan='3'>No payments yet.</td></tr>");
            }
            for(var i in results){
                $out.append("<tr><td>"+results[i][0]+"</td><td>"+results[i][1]+"</td><td>"+results[i][2]+"</td></tr>");
            }
        } catch(e) {
            $out.append("<tr><td colspan='3'>Payments contain a cycle!<br>"+e+"</td></tr>");
        }
        var $entities = $('#entities').empty();
        for(var e in entities){
            $entities.append('<option value="'+e+'">');
        }
    });
    pc.list();
});