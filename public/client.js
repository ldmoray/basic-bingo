function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

let currentNumber = "";

function httpGetAsync(theUrl, callback) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.responseType = "json";
  xmlHttp.onreadystatechange = function() {
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
      callback(xmlHttp.response);
    }
  };
  xmlHttp.open("GET", theUrl, true); // true for asynchronous
  xmlHttp.send(null);
}

function hostLoaded() {
  document.getElementById("gameCode").innerHTML = getCookie("gameCode");
  let currentNum = getCookie("currentNumber");
  if (currentNum) {
    document.getElementById("currentNumber").innerHTML = currentNum;
  }
}

function getNextNumber() {
  httpGetAsync("/getNextNumber", function(x) {
    document.getElementById("number-zone").innerHTML = x.number;
    if (x.number !== currentNumber) {
      var synth = window.speechSynthesis;
      var num = x.number;
      speak(num);
      if (x.number !== "Please Wait") {
        num =  num.split("").join(" ");
        setTimeout(speak, 1500, num);
      }
      currentNumber = x.number;
    }
  });
}


function speak(text) {
    var synth = window.speechSynthesis;
  var utterThis = new SpeechSynthesisUtterance(text);
  let voices = synth.getVoices();
  let voice = "";
  for (let i = 0; i++; i < voices.length) {
    if (voices[i].name === "Google US English") {
      voice = voices[i];
      break;
    }
    if (voices[i].name === "Google UK English Female") {
      voice = voices[i];
      break;
    }
    if (
      voices[i].name === "Microsoft David Desktop - English (United States)"
    ) {
      voice = voices[i];
      break;
    }
    if (voices[i].name === "Daniel") {
      voice = voices[i];
      break;
    }
  }
  if (voice) {
    utterThis.voice = voice;
  } 
  utterThis.rate = 0.75;
  synth.speak(utterThis);
  
}

function playerLoaded() {
  getNextNumber();
  setInterval(getNextNumber, 5000);
}

function enableSpeech() {
  speak("Enabled!")
  document.getElementById("enable-speech").classList.add("enabled");
}
