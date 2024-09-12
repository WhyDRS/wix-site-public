// Velo API Reference: https://www.wix.com/velo/reference/api-overview/introduction

import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { getResults } from 'backend/google-sheets';
import { getResultsBrokers } from 'backend/google-sheets';

var Templates;
var BrokerInfos;
var BrokersInfos;
var lastSearch = "";
var valueRadioSelectMailType = "0";
var lengthRadioSelectMailType = 0;
var redefineRadioSelectMailType = true;
var perfectBroker = false;
var debug_mode = true;
var option1 = { "label": "Allow DRS Transfer", "value": "0" };
var option2 = { "label": "Reduce DRS fees", "value": "1" };
var option3 = { "label": "Free DRS transfer", "value": "2" };

const delay = ms => new Promise(res => setTimeout(res, ms));

const setradioSelectMailType = async() =>
{
  let radioSelectMailTypeLength = $w("#radioSelectMailType").options.length;
  debugLog("radioSelectMailTypeLength : " + radioSelectMailTypeLength);
  
  if (BrokerInfos === undefined || radioSelectMailTypeLength != lengthRadioSelectMailType || redefineRadioSelectMailType )
  {
    var optionsradioSelectMailType = new Array();
    var selectedIndex = 0;
    perfectBroker = false;
    if (BrokerInfos === undefined)
    {
      optionsradioSelectMailType.push(option1);
      optionsradioSelectMailType.push(option2);
      optionsradioSelectMailType.push(option3);
    }
    else
    {
      if (!( BrokerInfos[1] === undefined ) && BrokerInfos[1] == "No") // DRS tranfert not available by the broker
      {
        optionsradioSelectMailType.push(option1);
        $w("#radioSelectMailType").collapse();
      }
      else
      {
        if (!( BrokerInfos[2] === undefined )) // DRS tranfert not available by the broker
        {
          let DRS_fees = BrokerInfos[2];
          DRS_fees = strReplaceAll(DRS_fees, "$", "");
          DRS_fees = strReplaceAll(DRS_fees, "€", "");
          let DRS_fees_number = parseInt(DRS_fees);
          debugLog("DRS_fees_number : " + DRS_fees_number);
          if (DRS_fees_number > 0)
          {
            optionsradioSelectMailType.push(option2);
            optionsradioSelectMailType.push(option3);
          }
          else if (DRS_fees_number == 0)
          {
            debugLog("DRS_fees_number free");
            perfectBroker = true;
          }
          $w("#radioSelectMailType").expand();
        }
      }
    }
    debugLog("optionsradioSelectMailType : " + JSON.stringify(optionsradioSelectMailType));
    $w("#radioSelectMailType").options = optionsradioSelectMailType;
    lengthRadioSelectMailType = $w("#radioSelectMailType").options.length;
    if (lengthRadioSelectMailType > 0)
    {
      $w("#radioSelectMailType").selectedIndex = selectedIndex;
      debugLog("radioSelectMailType : " + selectedIndex);
    }
    radioSelectMailType_change();
    redefineRadioSelectMailType = false;
  }
}

$w.onReady(async function () {

  let query_broker = wixLocation.query['broker'];
  if (!( query_broker === undefined)) // Check if the parameter broker is filled on the url
  {
    query_broker = query_broker.toUpperCase().trim();
    $w("#inputSearchBroker").value = query_broker;
    debugLog("Ticker defined : " + query_broker);
  }
  $w('#inputYourName').value = "John Doe"; // Default value for inputYourName

  $w('#textEmail').readOnly = true;
  $w('#textEmailSubject').readOnly = true;
  $w('#textEmailBody').readOnly = true;

  // Mapping for listAutocompleteBroker
  $w('#listAutocompleteBroker').onItemReady( ($w, itemData, index) => {
    const textBroker = $w('#textAutocompleteBroker');
    textBroker.text = itemData.broker;
  });
  $w("#listAutocompleteBroker").collapse(); // Hide field listAutocompleteTicker

  $w('#buttonSearchBroker').collapse(); // Hide field buttonSearchBroker
  $w('#imageLoading').expand(); // Display field imageLoading
  registerHandlers(); // Register events on buttons and so on...
  setradioSelectMailType(); // Define Options on the Radio Buttons radioSelectMailType
  getTemplates("Brokers"); // Retrieve Templates
  getBrokers(); // Retrieve Companies Infos
});

// Register events on buttons and so on...
function registerHandlers() {
  $w('#buttonSearchBroker').onClick(() => searchBroker());
  $w('#buttonNewTemplate').onClick(() => searchBroker());
  $w('#buttonRefreshTemplate').onClick(() => searchBroker());
}

function debugLog(content) {
  if (debug_mode == true)
  {
    console.log(content);
  }
}

const setEmail = async(content) =>
{
  if (content.length == 0)
  {
    content = "Email not available";
    $w('#buttonContributeDB').expand();
  }
  else
  {
    $w('#buttonContributeDB').collapse();
  }
  $w('#textEmail').value = content;
  $w('#textEmail').expand();
}

const setEmailSubject = async(content) =>
{
  if (content.length == 0)
  {
    content = "Not available";
  }
  $w('#textEmailSubject').value = content;
  $w('#textEmailSubject').expand();
  $w('#buttonNewTemplate').expand();
  $w('#buttonRefreshTemplate').expand();
  $w('#linkEmailClient').expand();
}

const setEmailBody = async(content) =>
{
  if (content.length == 0)
  {
    content = "Not available";
  }
  $w('#textEmailBody').value = content;
  $w('#textEmailBody').expand();
  await setradioSelectMailType();
  
  if ($w("#radioSelectMailType").options.length == 0) // DRS tranfert already available by the broker, do not send email
  {
    let text = "DRS transfer already available and free DRS transfer, this is the perfect broker!";
    $w('#textEmailSubject').value = text;
    $w('#textEmailBody').value = text;
  }
}

function strReplaceAll(subject = "", search, replacement)
{
  function escapeRegExp( str ) { return str.toString().replace( /[^A-Za-z0-9_]/g, '\\$&' ); }
  search = search instanceof RegExp ? search : new RegExp( escapeRegExp(search), 'g' );
  return subject.replace( search, replacement );
}

function ReplaceCompanyInfo(source = "")
{
  if (!( BrokerInfos === undefined ) )
  {
    let yourName = $w('#inputYourName').value;
    
    if (yourName.length > 0)
    {
      source = strReplaceAll(source, "**YOUR_NAME**", yourName);
    }
    source = strReplaceAll(source, "**DRS_FEES**", BrokerInfos[2]);

    source = strReplaceAll(source, " .", ".");
    source = strReplaceAll(source, " ,", ".");
    source = strReplaceAll(source, ",,", ",");
    source = strReplaceAll(source, ":.", ".");
    source = strReplaceAll(source, ".,", ".");
    source = strReplaceAll(source, "!.", ".");
    source = strReplaceAll(source, "..", ".");
    source = strReplaceAll(source, "<", "");
  }
  return source;
}

const getTemplates = async(template_filter_recipient = "") => {
  let startDate = Math.floor(Date.now() / 1000);
  debugLog("Start getTemplates : " + startDate);
  if (Templates === undefined )
  {
    Templates = new Map();
    const result = await getResults("email_Templates!A1:M700");
    debugLog("get new Templates : " + startDate);

    // Read Templates
    for ( var i = 0; i < result.data.values.length; i++ )
    {
      var TemplateRecipient = result.data.values[i][1];
      var TemplateType = result.data.values[i][2];
      var TemplateID = result.data.values[i][3];
      var TemplateContent = result.data.values[i][6];
    
      if ( !(TemplateContent === undefined ) && TemplateContent != "" && ( template_filter_recipient == "" || template_filter_recipient == TemplateRecipient ) )
      {
        if (! Templates[TemplateType])
        {
          Templates[TemplateType] = new Array();
        }
        Templates[TemplateType].push( TemplateContent );
      }
    }
  }
  let endDate = Math.floor(Date.now() / 1000);
  debugLog("End getTemplates : " + endDate);
  debugLog("Duration getTemplates : " + ( endDate - startDate ).toString());
  $w('#imageLoading').collapse();
  if ($w('#inputSearchBroker').value.length >= 1)
  {
    await searchBroker();
  }
}

const getTemplate = async(template_filter_recipient = "") =>
{
  let inputSearchBroker = $w('#inputSearchBroker').value;

  if (Templates === undefined && inputSearchBroker.length >= 1)
  {
    await getTemplates(template_filter_recipient);
  }
  if (!( Templates === undefined ) && ( Templates["Body2" + valueRadioSelectMailType] === undefined ))
  {
    valueRadioSelectMailType = "0";
  }
  
  if (!( Templates === undefined ) && !( Templates["Subject" + valueRadioSelectMailType] === undefined ))
  {
    var subject_style = Math.floor(Math.random()*(Templates["Subject" + valueRadioSelectMailType].length));
    var greeting_style = Math.floor(Math.random()*(Templates["Greeting"].length));
    var body1_style = Math.floor(Math.random()*(Templates["Body1"].length));
    var body2_style = Math.floor(Math.random()*(Templates["Body2" + valueRadioSelectMailType].length));
    var body3_style = Math.floor(Math.random()*(Templates["Body3" + valueRadioSelectMailType].length));
    var goodbye_style = Math.floor(Math.random()*(Templates["Goodbye"].length));
    var body_style = greeting_style + "_" + body1_style + "_" + body2_style + "_" + body3_style + "_" + goodbye_style;

    debugLog("body_style : " + body_style);
    var subject = Templates["Subject" + valueRadioSelectMailType][subject_style];
    var body = Templates["Greeting"][greeting_style] + ",\r\r" + Templates["Body1"][body1_style] + "\r\r" + Templates["Body2" + valueRadioSelectMailType][body2_style] + "\r\r" + Templates["Body3" + valueRadioSelectMailType][body3_style] + "\r\r" + Templates["Goodbye"][goodbye_style] + "\r**YOUR_NAME**";

    var values = [ subject, body ];
    return values;
  }
}

const getBrokers = async() => {
  if (!( BrokersInfos === undefined )) // Brokers not yet filled
  {
    return;
  }
  let startDate = Math.floor(Date.now() / 1000);
  debugLog("Start getResultsBrokers : " + startDate);
  if (BrokersInfos === undefined) // Fill Companies
  {
    let BrokersInfosTmp = await getResultsBrokers("Translations!A3:O400");
    BrokersInfos = { data : { values : [] } };
    for (let i = 0; i < BrokersInfosTmp.data.values.length; i++)
    {
      if (BrokersInfosTmp.data.values[i][4] != "N/A" && BrokersInfosTmp.data.values[i][4] != "") // Retrieve Brokers from the list
      {
        BrokersInfos.data.values.push(BrokersInfosTmp.data.values[i]);
      }
    }
  }
  let endDate = Math.floor(Date.now() / 1000);
  debugLog("End getResultsBrokers : " + endDate);
  debugLog("Duration getResultsBrokers : " + ( endDate - startDate ).toString());
  
  $w('#buttonSearchBroker').expand();
}

const searchBroker = async() => {
  $w("#listAutocompleteBroker").collapse();
  let inputSearchBroker = $w('#inputSearchBroker').value;
  inputSearchBroker = inputSearchBroker.toUpperCase();

  let response = "Not found";
  let found = false;

  if (inputSearchBroker.length >= 1)
  {
    await getBrokers();

    let startDate = Math.floor(Date.now() / 1000);
    debugLog("Start Searching : " + startDate);
    debugLog("lastSearch : " + lastSearch);
    debugLog("inputSearchBroker : " + inputSearchBroker);
    for (let i = 0; i < BrokersInfos.data.values.length && !found; i++)
    {
      let value = "" + BrokersInfos.data.values[i][0];
      value = value.toUpperCase();
      if (value == inputSearchBroker) // Search the exact name for the broker
      {
        found = true;
        BrokerInfos = [ BrokersInfos.data.values[i][0], BrokersInfos.data.values[i][4], BrokersInfos.data.values[i][8], BrokersInfos.data.values[i][10], BrokersInfos.data.values[i][11], BrokersInfos.data.values[i][12], BrokersInfos.data.values[i][13]];
        response = BrokersInfos.data.values[i][11];
      }
    }
    let endDate = Math.floor(Date.now() / 1000);
    debugLog("End Searching : " + endDate);
    debugLog("Duration Searching : " + ( endDate - startDate ).toString());
    if (lastSearch != inputSearchBroker)
    {
      redefineRadioSelectMailType = true;
    }
    lastSearch = inputSearchBroker;

    await setEmail(response);
  }
  let valuesIRemail = await getTemplate("Brokers");
  if (!( valuesIRemail === undefined ) && valuesIRemail.length > 0)
  {
    await setEmailSubject(ReplaceCompanyInfo(valuesIRemail[0]));
    await setEmailBody(ReplaceCompanyInfo(valuesIRemail[1]));
  }
  await GenerateEmailLink(); // Generate link for the Email Client
}

const GenerateEmailLink = async() => {
  let textEmail = $w('#textEmail').value;
  let textEmailSubject = $w('#textEmailSubject').value;
  let textEmailBody = $w('#textEmailBody').value;

  textEmailSubject = encodeURIComponent(textEmailSubject);
  textEmailBody = encodeURIComponent(textEmailBody);
  textEmailBody = strReplaceAll(textEmailBody, "%0D", "%0D%0A"); // Replace caracter %0D by %0D%0A in order to display Carriage Return on mobile
  
  let buttonlink = `mailto:${textEmail}?subject=${textEmailSubject}&body=${textEmailBody}`;
  let isMobile = false;

  let emailImage ="https://static.wixstatic.com/media/cafcd7_e3212f954a434bce814a1475259b43fd~mv2.png"; // Fake button Email Client
  if (textEmail.indexOf("http") != -1)
  {
    emailImage = "https://static.wixstatic.com/media/cafcd7_40c94dd7c0404bc898e8b4defa66e324~mv2.png"; // Fake button Contact Broker
    buttonlink = textEmail + '" target="_blank';
  }
  let img = '<img src="' + emailImage + '" alt="Email Client" width="324px" height="49px">';
  if (navigator.userAgent.toLowerCase().match(/mobile/i))
  {
    isMobile = true;
    img = '<img src="' + emailImage + '" alt="Email Client" width="280px" height="40px">'; // Email Icon
    //emailImage ="https://static.wixstatic.com/media/cafcd7_5a3456e04ff24ce78cbf9ed00a6a9c7b~mv2.gif"; // Email Icon
    //img = '<img src="' + emailImage + '" alt="Email Client" width="50" height="50">'; // Email Icon
  }
  let linkEmailClient = '<a href="' + buttonlink + '">' + img + '</a>';
  debugLog("BrokerInfos : " + JSON.stringify(BrokerInfos));

  $w("#textCopied").collapse();
  if (perfectBroker == false)
  {
    $w('#linkEmailClient').html = linkEmailClient;
    $w('#linkEmailClient').expand();
    $w("#imageCopy").expand();
    $w("#buttonRefreshTemplate").expand();
    $w("#buttonNewTemplate").expand();
  }
  else
  {
    linkEmailClient = "";
    $w('#linkEmailClient').html = linkEmailClient;
    $w("#imageCopy").collapse();
    $w("#buttonRefreshTemplate").collapse();
    $w("#buttonNewTemplate").collapse();
  }
  
  $w('#buttonGuide').link = BrokerInfos[6];
  $w('#buttonGuide').expand();
}

export function inputSearchBroker_keyPress(event) {
  $w("#listAutocompleteBroker").data = [];
  $w("#listAutocompleteBroker").collapse();

  setTimeout(() => {
    let inputSearchBroker = $w('#inputSearchBroker').value;
    inputSearchBroker = inputSearchBroker.toUpperCase();
    debugLog("inputSearchBroker : " + inputSearchBroker);

    if (inputSearchBroker.length == 0 || ( BrokersInfos === undefined ) || lastSearch == inputSearchBroker)
    {
      return; // ignore if empty
    }
    
    let predictions = [];
    let predictionsTickers = [];
    inputSearchBroker = inputSearchBroker.trim();

    let startDate = Math.floor(Date.now() / 1000);
    debugLog("Start Autocomplete : " + startDate);

    // Search in Brokers names
    for (let i = 0; i < BrokersInfos.data.values.length && predictionsTickers.length <= 3; i++)
    {
      let valueCompany = "" + BrokersInfos.data.values[i][0];
      valueCompany = valueCompany.toUpperCase().trim();
      if (valueCompany.indexOf(inputSearchBroker) != -1)
      {
        if (predictionsTickers.includes(BrokersInfos.data.values[i][0]) == false && predictionsTickers.length <= 3)
        {
          predictionsTickers.push(BrokersInfos.data.values[i][0]);
          let values = [ BrokersInfos.data.values[i][0] ];
          predictions.push(values);
        }
      }
    }

    let suggestions = [];
    predictions.forEach(function (prediction)
    {
      let id = strReplaceAll(prediction[0], " ", "-");
      let item = { "_id": id, "broker": prediction[0] };
      suggestions.push(item);
    });
    $w("#listAutocompleteBroker").data = suggestions; // add the suggestions to the repeater
    $w("#listAutocompleteBroker").expand();	// we have data so we can expand the repeater

    let endDate = Math.floor(Date.now() / 1000);
    debugLog("End Autocomplete: " + endDate);
    debugLog("Duration Autocomplete : " + ( endDate - startDate ).toString());
    
    lastSearch = inputSearchBroker;
  }, 10);
}

export function containerAutocompleteBroker_click(event, $w)
{
  let textAutocompleteBroker = $w("#textAutocompleteBroker").text
  debugLog("textAutocompleteBroker : " + textAutocompleteBroker);
  $w("#inputSearchBroker").value = $w("#textAutocompleteBroker").text;
  
  $w("#listAutocompleteBroker").collapse();
  searchBroker();
}

export function radioSelectMailType_change(event) {
	valueRadioSelectMailType = $w("#radioSelectMailType").value;
  searchBroker();
}

export function imageCopy_click(event) {
  let textEmailBody = $w('#textEmailBody').value;

  wixWindow.copyToClipboard(textEmailBody)
  .then( () => {
    $w("#textCopied").expand();
  } )
  .catch( (err) => {
    // handle case where an error occurred
  } );
}