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
        _gaq.push(['_trackEvent', 'UserAction', 'RemovePayment']);
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
                $out.append("<tr><td colspan='3'>No payments yet. Enter payments above!</td></tr>");
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
    $("#new").click(function(e){
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
        _gaq.push(['_trackEvent', 'UserAction', 'AddPayment']);
    });
    $("#purge").click(function(){
        if(confirm("Are you sure? This is irreversible.")){
            pc.purge();
        }
    });
});