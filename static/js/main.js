function PayController(){
    var render = function(){};
    var dbSize = 5 * 1024 * 1024; // 5MB
    var db = openDatabase("PayTool", "1.0", "Payment Manager", dbSize);
    var that = this;
    db.transaction(function(tx) {
        tx.executeSql("CREATE TABLE IF NOT EXISTS exchange(ID INTEGER PRIMARY KEY ASC, sender TEXT, recipient TEXT, value NUM, description TEXT)", []);
    });

    var errorHandler = function(tx, e) {
        alert("There has been an error: " + e.message);
    };
    var successHandler = function(tx, r) {
        that.list();
    };

    this.add = function(to, from, value, description){
        to = to.toUpperCase();
        from = from.toUpperCase();
        db.transaction(function(tx){
            tx.executeSql("INSERT INTO exchange(sender, recipient, value, description) VALUES (?,?,?,?)",
            [to, from, value, description],
            successHandler,
            errorHandler);
        });
    };

    this.remove = function(id){
        db.transaction(function(tx){
            tx.executeSql("DELETE FROM exchange WHERE ID=?", [id],
            successHandler,
            errorHandler);
        });
    };

    this.purge = function(id){
        db.transaction(function(tx){
            tx.executeSql("DELETE FROM exchange", [],
            successHandler,
            errorHandler);
        });
    };

    this.update = function(id, to, from, value, description){
        to = to.toUpperCase();
        from = from.toUpperCase();
        db.transaction(function(tx){
            tx.executeSql("UPDATE exchange SET sender = ?, recipient = ?, value = ?, description = ? WHERE id = ?", [to, from, value, description, id],
            successHandler,
            errorHandler);
        });
    };

    this.list = function(){
        db.transaction(function(tx) {
            tx.executeSql("SELECT * FROM exchange", [], function(tx, rs) {
                var out = [];
                for (var i=0; i < rs.rows.length; i++) {
                    out.push(rs.rows.item(i));
                }
                render(out);
            },
            errorHandler);
        });
    };

    this.attach = function(callback){
        render = callback;
    };
}

function run(edges){

    var tmp = {}
    edges.forEach(function(v) {
        var from = v[0], to = v[1];
        if(!tmp[from+"&&&&"+to]){
            tmp[from+"&&&&"+to] = 0;
        }
        tmp[from+"&&&&"+to] += v[2];
        tmp[to+"&&&&"+from] = -tmp[from+"&&&&"+to];
    });
    edges = [];
    for(var x in tmp){
        if(tmp[x]>0){
            var v = x.split('&&&&');
            var from = v[0], to = v[1];
            edges.push([from,to,tmp[x]]);
        }
    }

    var sorted = tsort(edges);
    //sorted.reverse();
    var arr = new Array();
    for(var i in sorted){
        arr[sorted[i]] = new Array();
        for(var j in sorted){
            arr[sorted[i]][sorted[j]] = 0;
        }
    }
    for(var j in edges){
        arr[edges[j][0]][edges[j][1]] += edges[j][2];
    }
    var ct=0;
    for(var i in sorted){
        for(var j in sorted){
            if(i!=j){
                var c = arr[sorted[i]][sorted[j]];
                for(var k in sorted){
                    if(j!=k){
                        var a = arr[sorted[i]][sorted[k]];
                        var b = arr[sorted[k]][sorted[j]];
                        if(a && b){
                            //console.log(sorted[i],sorted[k],sorted[j]);
                            if(a < b){
                                arr[sorted[i]][sorted[j]] += a; // new c
                                arr[sorted[i]][sorted[k]] = 0; // new a
                                arr[sorted[k]][sorted[j]] = b-a; // new b
                            }else{
                                arr[sorted[i]][sorted[j]] += b; // new c
                                arr[sorted[i]][sorted[k]] = a-b; // new a
                                arr[sorted[k]][sorted[j]] = 0; // new b
                            }
                            //printGraph(ct++);
                        }
                    }
                }
            }
        }
    }
    var out = [];
    for(var i in sorted){
        for(var j in sorted){
            if(i!=j){
                var c = arr[sorted[i]][sorted[j]];
                if(c){
                    out.push([sorted[i], sorted[j], c.toFixed(2)]);
                }
            }
        }
    }
    return out;
}

$(document).ready(function(){
    var $list = $('#transactions tbody');
    var $out = $('#out tbody');
    pc = new PayController();
    $(".modify-payment").live("change", function(){
        var $parent = $(this).parent().parent();
        var id = $parent.data("id");
        pc.update(
            id,
            $('.payment-from', $parent).val(),
            $('.payment-to', $parent).val(),
            $('.payment-value', $parent).val(),
            $('.payment-description', $parent).val()
        );
    });
    $(".remove-payment").live("click", function(){
        if(confirm("Are you sure? This is irreversible.")){
            pc.remove($(this).parent().parent().data("id"));
        }
    });
    pc.attach(function(a){
        var that = this;
        $list.empty();
        var out = [];
        var entities = {};
        for(var i in a){
            var $to = $("<input class='form-control modify-payment payment-to' list='entities' placeholder='to'>").val(a[i].recipient);
            $to = $("<td>").append($to);
            var $from = $("<input class='form-control modify-payment payment-from' list='entities' placeholder='from'>").val(a[i].sender);
            $from = $("<td>").append($from);
            var $value = $("<input class='form-control modify-payment payment-value' type='number' placeholder='amount'>").val(a[i].value);
            $value = $("<td>").append($value);
            var $description = $("<input class='form-control modify-payment payment-description' placeholder='description'>").val(a[i].description);
            $description = $("<td>").append($description);
            var $remove = $("<td><div class='btn btn-warning remove-payment'>Remove</div></td>");
            var $row = $("<tr>").data("id", a[i].ID).append($from, $to, $value, $description, $remove);
            $list.append($row);
            out.push([a[i].sender, a[i].recipient, a[i].value]);
            entities[a[i].sender] = 1;
            entities[a[i].recipient] = 1;
        }
        $out.empty();
        try {
            var results = run(out);
            if(results.length == 0){
                $out.append("<tr><td colspan='5'>No payments yet. Enter payments above!</td></tr>");
            }
            for(var i in results){
                $out.append("<tr><td>"+results[i][0]+"</td><td>"+results[i][1]+"</td><td>"+results[i][2]+"</td></tr>");
            }
        } catch(e) {
            $out.append("<tr><td colspan='5'>Payments contain a cycle!<br>"+e+"</td></tr>");
        }
        var $entities = $('#entities').empty();
        for(var e in entities){
            $entities.append('<option value="'+e+'">');
        }
    });
    pc.list();
    $("#new").click(function(e){
        e.preventDefault();
        var $from = $("#new-from");
        var $to = $("#new-to");
        var $value = $("#new-value");
        var $description = $("#new-description");
        pc.add($from.val(), $to.val(), $value.val(), $description.val());
        $from.val('');
        $to.val('');
        $value.val('0');
        $description.val('');
        $from.focus();
    });
    $("#purge").click(function(){
        if(confirm("Are you sure? This is irreversible.")){
            pc.purge();
        }
    });
});