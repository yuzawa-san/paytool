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
            var $to = $("<input class='form-control modify-payment payment-to input-sm' list='entities' placeholder='to'>").val(a[i].to);
            $to = $("<td>").append($to);
            var $from = $("<input class='form-control modify-payment payment-from input-sm' list='entities' placeholder='from'>").val(a[i].from);
            $from = $("<td>").append($from);
            var $value = $("<input class='form-control modify-payment payment-value input-sm' type='number' placeholder='amount'>").val(a[i].value);
            $value = $("<td>").append($value);
            var $description = $("<input class='form-control modify-payment payment-description input-sm' placeholder='description'>").val(a[i].description);
            $description = $("<td>").append($description);
            var $remove = $("<td><div class='btn btn-warning remove-payment btn-xs'><span class='glyphicon glyphicon-minus'></span> Remove</div></td>");
            var $row = $("<tr>").data("id", a[i].id).append($from, $to, $value, $description, $remove);
            $list.append($row);
            entities[a[i].to] = 1;
            entities[a[i].from] = 1;
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
            return [x.from, x.to, x.value];
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
    var $acceptsRequests = $('#editor-requests');
    $('#editor-save').click(function(){
        ajaxHelper("PUT","/api/sheet", {id: sheet_id, name: $name.val(), private: $private.val(), acceptsRequests: $acceptsRequests.val()}, function(r){
            window.location.reload();
        });
    });
    var $link = $('#link-url').val(window.location);
    var $link = $('#submit-url').val(window.location+"/submit");
    $('.copy-url').click(function(){
        $(this).select();
    });
    
    var $inbox = $('#requestList tbody');
    var inboxCount = 0;
    var $inboxCount = $('#inbox-qty');
    var $inboxBtn = $('#inboxBtn');
    var updateInboxCount = function(){
        if(inboxCount > 0){
            $inboxBtn.show();
            $inboxCount.html(" <strong>("+inboxCount+")</strong>");
        }else{
            $inboxCount.empty();
            $inboxBtn.hide();
            $inbox.html("<tr><td colspan='6'>No Requests!</td><tr>")
        }
    }
    
    ajaxHelper("GET","/api/request", {sheet_id: sheet_id}, function(r){
        $.each(r, function(){
            var $row = $("<tr>");
            $row.append("<td><input type='checkbox' value='"+this.owner.email+"' checked></td>");
            $row.append("<td>"+this.owner.email+"</td>");
            $row.append("<td>"+this.from+"</td>");
            $row.append("<td>"+this.to+"</td>");
            $row.append("<td>"+this.value.toFixed(2)+"</td>");
            $row.append("<td>"+this.description+"</td>");
            $row.data('object', this);
            $inbox.append($row);
        });
        inboxCount = r.length;
        updateInboxCount();
    });
    
    var getSelected = function(){
        var out = [];
        $('input:checked', $inbox).each(function(){
            out.push($(this).parent().parent());
        });
        return out;
    };
    $('#request-selector').click(function(){
        if($(this).attr('checked')){
            $('input', $inbox).attr('checked', true);
        }else{
            $('input', $inbox).attr('checked', false);
        }
    });
    $('#request-remove').click(function(){
        if(!confirm("Are you sure you wish to remove the selected requests? This cannot be undone.")){
            return;
        }
        $.each(getSelected(), function(){
            var $row = this;
            ajaxHelper("DELETE","/api/request", {sheet_id: sheet_id, id: this.data('object').id}, function(r){
                $row.remove();
                inboxCount--;
                updateInboxCount();
            });
        });
         _gaq.push(['_trackEvent', 'PaymentAction', 'DenyRequest']);
    });
    $('#request-migrate').click(function(){
        $.each(getSelected(), function(){
            var row = this.data('object');
            var $row = this;
            var senders = row.from.split(/,\s*/);
            var recipients = row.to.split(/,\s*/);
            var description = row.description;
            if(senders.length > 1 && recipients.length > 1){
                alert("Only the sender OR the recipient may be a group of people. Both may not be groups.");
                return;
            }
            var value = row.value / Math.max(recipients.length, senders.length);
            if(senders.length > 1){
                for(var i in senders){
                    pc.add(senders[i], recipients[0], value, description);
                }
            }else{
                for(var i in recipients){
                    pc.add(senders[0], recipients[i], value, description);
                }
            }
            ajaxHelper("DELETE","/api/request", {sheet_id: sheet_id, id: row.id}, function(r){
                $row.remove();
                inboxCount--;
                updateInboxCount();
            });
             _gaq.push(['_trackEvent', 'PaymentAction', 'MigrateRequest']);
        });
    });
});