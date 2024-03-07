var $ = function(id) {
    return document.getElementById(id);
},

// sounds = [
//     {value: "pushover", text: "Pushover (default)"},
//     {value: "bike", text: "Bike"},
//     {value: "bugle", text: "Bugle"},
//     {value: "cashregister", text: "Cash Register"},
//     {value: "classical", text: "Classical"},
//     {value: "cosmic", text: "Cosmic"},
//     {value: "falling", text: "Falling"},
//     {value: "gamelan", text: "Gamelan"},
//     {value: "incoming", text: "Incoming"},
//     {value: "intermission", text: "Intermission"},
//     {value: "magic", text: "Magic"},
//     {value: "mechanical", text: "Mechanical"},
//     {value: "pianobar", text: "Piano Bar"},
//     {value: "siren", text: "Siren"},
//     {value: "spacealarm", text: "Space Alarm"},
//     {value: "tugboat", text: "Tug Boat"},
//     {value: "alien", text: "Alien Alarm (long)"},
//     {value: "climb", text: "Climb (long)"},
//     {value: "persistent", text: "Persistent (long)"},
//     {value: "echo", text: "Pushover Echo (long)"},
//     {value: "updown", text: "Up Down (long)"},
//     {value: "none", text: "None (silent)"}
// ],
show_message = function(message, hide_in_seconds) {
    $('message').innerHTML = message;
    if (hide_in_seconds) {
        setTimeout(function() {
            $('message').innerHTML = '&nbsp;';
        }, hide_in_seconds * 1000);
    }
},
reload_contextmenus = function() {
    chrome.runtime.sendMessage({
        action: 'reload-contextmenus'
    });
},
split_by_comma_list = function(value) {
    if (!value) {
        return [];
    }
    return value.split(',');
},
// draw_devices = function() {
//     if (!localStorage.devices_all) {
//         return;
//     }
//     var devices_all = split_by_comma_list(localStorage.devices_all),
//         devices_badge = split_by_comma_list(localStorage.devices_badge),
//         devices_menu = split_by_comma_list(localStorage.devices_menu),
//         create_checkbox = function(name, value) {
//             var label = document.createElement('label'),
//                 chbox = document.createElement('input'),
//                 text = document.createElement('span'),
//                 list;

//             if (name === 'badge') {
//                 list = devices_badge;
//             } else {
//                 list = devices_menu;
//             }

//             chbox.type = 'checkbox';
//             chbox.value = value;

//             if (list.indexOf(value) >= 0) {
//                 chbox.checked = true;
//             }

//             chbox.onchange = function() {
//                 var vlist;
//                 if (name === 'badge') {
//                     vlist = split_by_comma_list(localStorage.devices_badge);
//                 } else {
//                     vlist = split_by_comma_list(localStorage.devices_menu);
//                 }

//                 if (this.checked && vlist.indexOf(value) === -1) {
//                     vlist.push(value);
//                 } else if (!this.checked && vlist.indexOf(value) >= 0) {
//                     vlist.splice(vlist.indexOf(value), 1);
//                 }
//                 vlist = vlist.join(',');
//                 if (name === 'badge') {
//                     localStorage.devices_badge = vlist;
//                 } else {
//                     localStorage.devices_menu = vlist;
//                     reload_contextmenus();
//                 }
//             };
//             label.appendChild(chbox);
//             text.innerHTML = value;
//             label.appendChild(text);
//             return label;
//         };

//     $('devices_badge').innerHTML = '';
//     $('devices_menu').innerHTML = '';

//     for (var i = 0; i < devices_all.length; i++) {
//         var device = devices_all[i];
//         $('devices_badge').appendChild(create_checkbox('badge', devices_all[i]));
//         $('devices_menu').appendChild(create_checkbox('menu', devices_all[i]));
//     }

// },
// update_devices = function(devices) {
//     var devices_badge = split_by_comma_list(localStorage.devices_badge),
//         devices_menu = split_by_comma_list(localStorage.devices_menu),
//         list;

//     localStorage.devices_all = devices.join(',');

//     if (devices_badge) {
//         list = [];
//         for (var i = 0; i < devices_badge.length; i++) {
//             if (devices.indexOf(devices_badge[i]) !== -1) {
//                 list.push(devices_badge[i]);
//             }
//         }
//         localStorage.devices_badge = list.join(',');
//     }

//     if (devices_menu) {
//         list = [];
//         for (var j = 0; j < devices_menu.length; j++) {
//             if (devices.indexOf(devices_menu[j]) !== -1) {
//                 list.push(devices_menu[j]);
//             }
//         }
//         localStorage.devices_menu = list.join(',');
//     }
//     return draw_devices();
// },
validate = function() {
    var token = localStorage.token || '',
        userkey = localStorage.userkey || '';

    if (!userkey || !token) {
        show_message('Please fill both fields!');
        return;
    }

    var req = new XMLHttpRequest();
    var url = 'https://api.telegram.org/bot' + 
                     token + 
                    '/sendMessage';
    url += '?chat_id=' + encodeURIComponent(userkey);
    url += '&text=' + encodeURIComponent('Setting for "CUSTOM Send-to-Telegram-SwiftBot" successfully.');
    req.open('GET', url, true);
    req.setRequestHeader("Content-Type", "application/json");
    req.send();

    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            var response = JSON.parse(req.responseText);
            console.log(response);            
            if (req.status === 200) {
                localStorage.valid = token + userkey;
                // update_devices(response.devices);
                // show_message('OK, seems legit! Please review the device checkboxes below.', 15);
                // reload_contextmenus();
            } else {
                localStorage.valid = '';
                if (response.errors) {
                    show_message('Error: ' + response.errors);
                } else {
                    show_message('Something is fishy: ' + req.responseText);
                }
            }
        }
    };
},
save = function() {
    localStorage.userkey = $('userkey').value;
    localStorage.token = $('token').value;
    // var sound = sounds[$('sounds').selectedIndex];
    // if (sound) {
    //     localStorage.sound = sounds[$('sounds').selectedIndex].value;
    // }
    show_message('Saved!');
    validate();
},
load = function() {
    $('userkey').value = localStorage.userkey || '';
    $('token').value = localStorage.token || '';

    // for (var i = 0; i < sounds.length; i++) {
    //     var sound = sounds[i],
    //         option = document.createElement('option');
    //     option.value = sound.value;
    //     option.innerText = sound.text;
    //     if (option.value === localStorage.sound) {
    //         option.selected = true;
    //     }
    //     $('sounds').appendChild(option);
    // }
    // draw_devices();
    if(localStorage._options_msg) {
        show_message(localStorage._options_msg);
        localStorage.removeItem('_options_msg');
    }
};

$('save').addEventListener('click', save);
window.addEventListener("load", load);
