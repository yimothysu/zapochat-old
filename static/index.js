document.addEventListener('DOMContentLoaded', () => {
    function appendPreviousMessages() {
        if(messages != null) {
            console.log('messages: ' + JSON.stringify(messages, null, 2));
            console.log(`Truth/falsity of messages containing room (should be true): ${messages.hasOwnProperty(roomname)}`);
            console.log('messages in current room: ' + messages[roomname]);
            if (messages.hasOwnProperty(roomname) && messages[roomname] != undefined) {
                for (var i = 0; i < messages[roomname].length; i++) {
                    document.querySelector('#messages').innerHTML += `<span class="badge badge-info">${messages[roomname][i].timestamp}</span> <b>${messages[roomname][i].displayname}:</b> ${messages[roomname][i].message}<br>`;
                    console.log(`#messages innerHTML appended: ${messages[roomname][i].displayname}: ${messages[roomname][i].message}`);
                }
            }
        }
    }

    function getDateAndTime() {
        var date = new Date();
        var mm = date.getMonth() + 1;
        var dd = date.getDate();
        var yyyy = date.getFullYear();
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();

        if (minutes < 10) {
            minutes = '0' + minutes;
        }

        if (seconds < 10) {
            seconds = '0' + seconds;
        }

        var dateAndTime = mm + '/' + dd + '/' + yyyy + ' ' + hours + ':' + minutes + ':' + seconds;

        return dateAndTime;
    }

    var messages = JSON.parse(document.querySelector('#messages-dictionary').innerHTML);
    var displayname;
    var roomname;

    //automaically show welcome dialog if no username is in local storage
    if (!localStorage.getItem('displayname')) {
        $('#displayname-dialog').modal('show');
    } else {
        displayname = localStorage.getItem('displayname');
    }

    if (localStorage.getItem('roomname') !== null) {
        roomname = localStorage.getItem('roomname');
    } else {
        roomname = 'lobby';
    }

    document.querySelector('#change-room-btn').value = `Leave Room ${roomname}`;

    document.querySelector('#displayname-modal-form').onsubmit = () => {
        displayname = document.querySelector('#enter-displayname').value;
        if (displayname != '') {
            localStorage.setItem('displayname', displayname);
            $('#displayname-dialog').modal('hide');
            socket.emit('join room', {roomname: roomname, displayname: displayname});
            console.log(`joined room with roomname ${roomname} and displayname ${displayname}`);
        }

        //don't reload the page
        return false;
    };

    $('#add-btn').popover({
        placement: 'top',
        /*content: function() {
            return $('#add-popover-content').html();
        },*/
        content: `<form id="image-form">Add image by URL: <input type="text" class="form-control image-form" id="image-url" placeholder="Enter URL" autocomplete="off"></form>`,
        container: 'body',
        sanitize: false
    });

    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    socket.on('connect', () => {
        console.log('socket connected!');
        if (displayname != null) {
            socket.emit('join room', {roomname: roomname, displayname: displayname});
            console.log(`joined room with roomname ${roomname} and displayname ${displayname}`);
            socket.emit('wait until joined initial room');
        }

        appendPreviousMessages();

        for (var i = 0; i < Object.keys(messages).length; i++) {
            console.log('messages keys [i]: ' + Object.keys(messages)[i]);
            document.querySelector('#room-dropdown').innerHTML += `<input type="button" id="dropdown-${Object.keys(messages)[i]}" class="dropdown-item" value="${Object.keys(messages)[i]}">`;
        }

        document.querySelector('#room-dropdown').addEventListener('click', function(e){
            console.log('room dropdown event listener fired');
            if (e.target && e.target.nodeName == 'INPUT') {
                console.log('clicked');
                roomname = e.target.id.replace('dropdown-', '');
                localStorage.setItem('roomname', roomname);
                document.querySelector('#change-room-btn').value = `Leave Room ${roomname}`;
                document.querySelector('#messages').innerHTML = '';
                appendPreviousMessages();

                socket.emit('join room', {roomname: roomname, displayname: displayname});
                console.log(`joined room from change dropdown with roomname ${roomname} and displayname ${displayname}`);
            }
        });

        document.querySelector('#message-form').onsubmit = () => {
            const message_input = document.querySelector('#enter-message');
            if (message_input.value != '') {
                socket.emit('send message', {displayname: displayname, message: document.querySelector('#enter-message').value, timestamp: getDateAndTime(), roomname: roomname});
                console.log(`message sent by user ${displayname}: ${document.querySelector('#enter-message').value}`);
                message_input.value = '';
            }

            //don't reload the page
            return false;
        };

        document.querySelector('#change-room-modal-form').onsubmit = () => {
            roomname = document.querySelector('#enter-roomname').value;
            localStorage.setItem('roomname', roomname);
            document.querySelector('#change-room-btn').value = `Leave Room ${roomname}`;
            $('#change-room-dialog').modal('hide');
            document.querySelector('#messages').innerHTML = '';
            appendPreviousMessages();

            socket.emit('join room', {roomname: roomname, displayname: displayname});
            console.log(`joined room from change room modal with roomname ${roomname} and displayname ${displayname}`);

            //don't reload the page
            return false;
        };

        console.log("image_url: " + document.querySelector('#image-url').value);
        $(document).on('submit', '#image-form', () => {
            const url = document.querySelector('.popover #image-url').value;
            socket.emit('send image', {roomname: roomname, displayname: displayname, timestamp: getDateAndTime(), url: url});

            //don't reload the page
            return false;
        });
    });

    socket.on('announce join', data => {
        document.querySelector('#messages').innerHTML += '<i>' + data.displayname + ' has joined the room' + '</i>' + '<br>';
    });

    socket.on('announce message', data => {
        document.querySelector('#messages').innerHTML += `<span class="badge badge-info">${data.timestamp}</span> <b>${data.displayname}:</b> ${data.message}<br>`;
    });

    socket.on('update messages', data => {
        messages = data.messages;
        console.log('updated messages to ' + messages);
    });

    socket.on('create room', data => {
        document.querySelector('#room-dropdown').innerHTML += `<input type="button" id="dropdown-${data.roomname}" class="dropdown-item" value="${data.roomname}">`;
        console.log(`room created: ${data.roomname}`);
    });

    document.querySelector('#change-room-btn').onclick = () => {
        $('#change-room-dialog').modal('show');
    };
});