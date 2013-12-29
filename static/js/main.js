$(document).ready(function(){
    var $list = $('#transactions tbody');
    var $out = $('#out tbody');
    var $flow = $('#flow tbody');
    pc = new PayController();
    $(".modify-payment").live("change", function(){
        var $parent = $(this).parent().parent();
        var id = $parent.data("id");
        var $from = $('.payment-from', $parent);
        var $to = $('.payment-to', $parent);
        pc.update(
            id,
            $from.val(),
            $to.val(),
            $('.payment-value', $parent).val(),
            $('.payment-description', $parent).val()
        );
        $from.val($from.val().toUpperCase());
        $to.val($to.val().toUpperCase());
    });
    $(".remove-payment").live("click", function(){
        if(confirm("Are you sure? This is irreversible.")){
            pc.remove($(this).parent().parent().data("id"));
        }
        _gaq.push(['_trackEvent', 'PaymentAction', 'RemovePayment']);
    });
    pc.attach(function(a, redraw){
        var that = this;
        $list.empty();
        var entities = {};
        for(var i in a){
            var $to = $("<input class='form-control modify-payment payment-to input-sm' list='entities' placeholder='to'>").val(a[i].from);
            $to = $("<td>").append($to);
            var $from = $("<input class='form-control modify-payment payment-from input-sm' list='entities' placeholder='from'>").val(a[i].to);
            $from = $("<td>").append($from);
            var $value = $("<input class='form-control modify-payment payment-value input-sm' type='number' placeholder='amount'>").val(a[i].value);
            $value = $("<td>").append($value);
            var $description = $("<input class='form-control modify-payment payment-description input-sm' placeholder='description'>").val(a[i].description);
            $description = $("<td>").append($description);
            var $remove = $("<td><div class='btn btn-warning remove-payment btn-xs'><span class='glyphicon glyphicon-minus'></span> Remove</div></td>");
            var $row = $("<tr>").data("id", a[i].id).append($from, $to, $value, $description, $remove);
            $list.append($row);
            entities[a[i].from] = 1;
            entities[a[i].to] = 1;
        }
        var $entities = $('#entities').empty();
        for(var e in entities){
            $entities.append('<option value="'+e+'">');
        }
    },
    function(a){
        $out.empty();
        $flow.empty();
        var out = a.map(function(x){
            return [x.to, x.from, x.value];
        });
        if(out.length == 0){
            $out.append("<tr><td colspan='3'>No payments yet. Enter payments above!</td></tr>");
            return;
        }
        try {
            var results = run(out);
            for(var row in results){
                var delta = results[row].value;
                var action;
                if(delta < 0){
                    action = "<span class='action-neg'>pays</span>";
                }else{
                    action = "<span class='action-pos'>receives</span>";
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
    var newHandler = function(e){
        e.preventDefault();
        var $from = $("#new-from");
        var $to = $("#new-to");
        var $value = $("#new-value");
        var $description = $("#new-description");
        var senders = $from.val().split(/,\s*/);
        var recipients = $to.val().split(/,\s*/);
        var description = $description.val();
        if(senders.length > 1 && recipients.length > 1){
            alert("Only the sender OR the recipient may be a group of people. Both may not be groups.");
            return;
        }
        var value = parseFloat($value.val()) / Math.max(recipients.length, senders.length);
        if(senders.length > 1){
            for(var i in senders){
                pc.add(senders[i], recipients[0], value, description);
            }
        }else{
            for(var i in recipients){
                pc.add(senders[0], recipients[i], value, description);
            }
        }
        $from.val('');
        $to.val('');
        $value.val('0');
        $description.val('');
        $from.focus();
        _gaq.push(['_trackEvent', 'PaymentAction', 'AddPayment']);
    };
    $(".new-transaction-enter").keyup(function(e){
        if (e.which == 13) {
            newHandler(e);
        }
    });
    $("#new").click(newHandler);
    $("#purge").click(function(){
        if(confirm("Are you sure? This is irreversible.")){
            pc.purge();
        }
    });
    
    var $name = $('#editor-name');
    var $private = $('#editor-private');
    var $modal = $('#editor');
    $('#editor-save').click(function(){
        ajaxHelper("PUT","/api/sheet", {id: sheet_id, name: $name.val(), private: $private.val()}, function(r){
            window.location.reload();
        });
    });
    $('#link-url').val(window.location).click(function(){
        $(this).select();
    });
});