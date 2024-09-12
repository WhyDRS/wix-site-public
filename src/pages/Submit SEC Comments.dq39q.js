// Velo API Reference: https://www.wix.com/velo/reference/api-overview/introduction

import wixWindow from 'wix-window';
import { getResults } from 'backend/google-sheets';

var Templates;
var Rules;
var RuleInfos;
var textGeneric = "Generic";
var valueRadioSelectSECComment = "0";
var valueRadioSelectOfficial = "Official";
var arrayOfficial = ["Official", "Unofficial"];
var arrayGeneric;
var email = "";
var emailSubject = "";
var emailBody = "";
var debug_mode = true;
//var optionOther = { "label": "Other", "value": "9999" };

const setRadioSelectSECComment = async() =>
{
  if (! (Rules === undefined) )
  {
    var optionsradioSelectSECComment = new Array();
    var selectedIndex = 0;
    
    // Read Rules
    for ( var i = 0; i < Rules.length; i++ )
    {
      var opt = { "label": Rules[i], "value": i.toString() };
      optionsradioSelectSECComment.push(opt);
    }
    //optionsradioSelectSECComment.push(optionOther);
    if (Rules.includes(textGeneric) == false)
    {
      Rules.push(textGeneric);
    }
    
    debugLog("Rules : " + JSON.stringify(Rules));
    $w("#radioSelectSECComment").options = optionsradioSelectSECComment;
    $w("#radioSelectSECComment").selectedIndex = selectedIndex;
    radioSelectMailType_change();
 }
}

const defineFieldsProperties = async() =>
{
  arrayGeneric = new Array();
  if (!(Rules === undefined) && Rules[valueRadioSelectSECComment] != null)
  {
    arrayGeneric.push(Rules[valueRadioSelectSECComment]);
  }
  arrayGeneric.push(textGeneric);
  if (valueRadioSelectSECComment != "9999")
  {
    $w('#textEmail').readOnly = true;
    $w('#textEmailSubject').readOnly = true;
    $w('#textEmailBody').readOnly = true;
  }
  else
  {
    $w('#textEmail').readOnly = false;
    $w('#textEmailSubject').readOnly = false;
    $w('#textEmailBody').readOnly = false;
  }
}

$w.onReady(async function () {

  $w('#inputYourName').value = "John Doe"; // Default value for inputYourName
  $w("#inputNbReasons").value = "3";
  defineFieldsProperties();

  $w('#imageLoading').expand(); // Display field imageLoading
  registerHandlers(); // Register events on buttons and so on...
  getTemplates("SEC"); // Retrieve Templates
});

// Register events on buttons and so on...
function registerHandlers() {
  $w('#buttonNewTemplate').onClick(() => searchRule());
  $w('#buttonRefreshTemplate').onClick(() => searchRule());
}

function debugLog(content) {
  if (debug_mode == true)
  {
    console.log(content);
  }
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
}

function strReplaceAll(subject = "", search, replacement)
{
  function escapeRegExp( str ) { return str.toString().replace( /[^A-Za-z0-9_]/g, '\\$&' ); }
  search = search instanceof RegExp ? search : new RegExp( escapeRegExp(search), 'g' );
  return subject.replace( search, replacement );
}

function ReplaceRuleInfo(source = "")
{
  if (!( RuleInfos === undefined ) )
  {
    let yourName = $w('#inputYourName').value;
    
    if (yourName.length > 0)
    {
      source = strReplaceAll(source, "**YOUR_NAME**", yourName);
    }

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
    const result = await getResults("email_Templates!A1:M2000");
    debugLog("get new Templates : " + startDate);

    // Read Templates
    for ( var i = 0; i < result.data.values.length; i++ )
    {
      var TemplateGroup = result.data.values[i][0];
      var TemplateRecipient = result.data.values[i][1];
      var TemplateType = result.data.values[i][2];
      var TemplateID = result.data.values[i][3];
      var TemplateOfficial = result.data.values[i][4];
      var TemplateContent = result.data.values[i][6];
    
      if ( !(TemplateContent === undefined ) && TemplateContent != "" && ( template_filter_recipient == "" || template_filter_recipient == TemplateGroup ) )
      {
        if (Rules === undefined)
        {
          Rules = new Array();
        }
        if (Rules.includes(TemplateRecipient) == false && TemplateRecipient != "Generic")
        {
          Rules.push( TemplateRecipient );
        }
        if (! Templates[TemplateRecipient])
        {
          Templates[TemplateRecipient] = new Array();
        }
        Templates[TemplateRecipient].push( TemplateType );
        
        if (! Templates[TemplateRecipient][TemplateType])
        {
          Templates[TemplateRecipient][TemplateType] = new Map();
        }
        if (! Templates[TemplateRecipient][TemplateType][TemplateOfficial])
        {
          Templates[TemplateRecipient][TemplateType][TemplateOfficial] = new Array();
        }
        Templates[TemplateRecipient][TemplateType][TemplateOfficial].push( TemplateContent );
      }
    }
  }
  let endDate = Math.floor(Date.now() / 1000);
  debugLog("End getTemplates : " + endDate);
  debugLog("Duration getTemplates : " + ( endDate - startDate ).toString());
  await setRadioSelectSECComment();
  $w('#imageLoading').collapse();
}

const getTemplate = async(template_filter_recipient = "") =>
{
  defineFieldsProperties();
  if (Templates === undefined)
  {
    await getTemplates(template_filter_recipient);
  }
  var indexRadioSelectSECComment = parseInt( valueRadioSelectSECComment );
  if (valueRadioSelectSECComment == "9999")
  {
    indexRadioSelectSECComment = $w("#radioSelectSECComment").selectedIndex;
    valueRadioSelectOfficial = "";
  }

  if (!( Templates === undefined ) && !( Templates[Rules[indexRadioSelectSECComment]] === undefined ) && !( Templates[Rules[indexRadioSelectSECComment]]["Body1"][valueRadioSelectOfficial] === undefined ))
  {
    var localOfficial = arrayOfficial[0];
    var subject_style = 0;
    if (valueRadioSelectSECComment == "9999")
    {
      localOfficial = "";
    }
    else
    {
      subject_style = Math.floor(Math.random()*(Templates[Rules[indexRadioSelectSECComment]]["Subject"][localOfficial].length));
    }
    
    var header_style = 0;
    if (valueRadioSelectOfficial == arrayOfficial[0])
    {
      Math.floor(Math.random()*(Templates[Rules[indexRadioSelectSECComment]]["Header"][valueRadioSelectOfficial].length));
    }
    debugLog("Greeting : ");
    var greeting_style = Math.floor(Math.random()*(Templates[Rules[indexRadioSelectSECComment]]["Greeting"][localOfficial].length));

    var body1_style = Math.floor(Math.random()*(Templates[Rules[indexRadioSelectSECComment]]["Body1"][valueRadioSelectOfficial].length));
    var body2_style = 0;
    body2_style = Math.floor(Math.random()*(Templates[Rules[indexRadioSelectSECComment]]["Body2"][valueRadioSelectOfficial].length));
    var body3_style = Math.floor(Math.random()*(Templates[Rules[indexRadioSelectSECComment]]["Body3"][valueRadioSelectOfficial].length));
    
    debugLog("Goodbye : ");
    var goodbye_style = Math.floor(Math.random()*(Templates[Rules[indexRadioSelectSECComment]]["Goodbye"][localOfficial].length));
    var body_style = header_style + "_" + greeting_style + "_" + body1_style + "_" + body2_style + "_" + body3_style + "_" + goodbye_style;
    debugLog("body_style : " + body_style);

    if (valueRadioSelectSECComment != "9999")
    {
      emailSubject = Templates[Rules[indexRadioSelectSECComment]]["Subject"][localOfficial][subject_style];
    }
    emailBody = "";
    if (valueRadioSelectOfficial == arrayOfficial[0])
    {
      emailBody = emailBody + Templates[Rules[indexRadioSelectSECComment]]["Header"][valueRadioSelectOfficial][header_style] + "\r\r";
    }
    emailBody = emailBody + Templates[Rules[indexRadioSelectSECComment]]["Greeting"][localOfficial][greeting_style] + ",\r\r";
    emailBody = emailBody + Templates[Rules[indexRadioSelectSECComment]]["Body1"][valueRadioSelectOfficial][body1_style] + "\r\r";
    if (valueRadioSelectOfficial == arrayOfficial[0])
    {
      emailBody = emailBody + Templates[Rules[indexRadioSelectSECComment]]["Body2"][valueRadioSelectOfficial][body2_style] + "\r\r";
    }
    else
    {
      let NbReasons = parseInt( $w('#inputNbReasons').value );
      let arrayReasons = new Array();
      for ( var i = 0; i < 20  && arrayReasons.length < NbReasons; i++ )
      {
        var RandGeneric = Math.floor(Math.random()*(arrayGeneric.length));
        if(!Templates[arrayGeneric[RandGeneric]]){
          continue;
        }
        var key = ""
        if (arrayGeneric[RandGeneric] != textGeneric && valueRadioSelectSECComment != "9999")
        {
          key = arrayOfficial[1];
        }
        var RandStyle = Math.floor(Math.random()*(Templates[arrayGeneric[RandGeneric]]["Body2"][key].length));
        if (arrayReasons.includes(Templates[arrayGeneric[RandGeneric]]["Body2"][key][RandStyle]) == false)
        {
          arrayReasons.push(Templates[arrayGeneric[RandGeneric]]["Body2"][key][RandStyle]);
          emailBody = emailBody + Templates[arrayGeneric[RandGeneric]]["Body2"][key][RandStyle] + "\r\r";
        }
        else
        {
          debugLog("Already in arrayReasons");
        }
      }
    }
    emailBody = emailBody + Templates[Rules[indexRadioSelectSECComment]]["Body3"][valueRadioSelectOfficial][body3_style] + "\r\r";
    emailBody = emailBody + Templates[Rules[indexRadioSelectSECComment]]["Goodbye"][localOfficial][goodbye_style];
    emailBody = emailBody + "\r**YOUR_NAME**";
    
    RuleInfos = Templates[Rules[indexRadioSelectSECComment]];

    var values = [ emailSubject, emailBody ];
    return values;
  }
}

const searchRule = async() => {
  radioSelectMailType_change();
}

const GenerateEmailLink = async() => {
  let textEmail = $w('#textEmail').value;
  let textEmailSubject = $w('#textEmailSubject').value;
  let textEmailBody = $w('#textEmailBody').value;

  if (textEmailSubject == "")
  {
    textEmailSubject = " ";
  }
  textEmailSubject = encodeURIComponent(textEmailSubject);
  textEmailBody = encodeURIComponent(textEmailBody);
  textEmailBody = strReplaceAll(textEmailBody, "%0D", "%0D%0A"); // Replace caracter %0D by %0D%0A in order to display Carriage Return on mobile
  
  let buttonlink = `mailto:${textEmail}?subject=${textEmailSubject}&body=${textEmailBody}`;
  let isMobile = false;

  let emailImage ="https://static.wixstatic.com/media/cafcd7_e3212f954a434bce814a1475259b43fd~mv2.png"; // Fake button Email Client
  if (textEmail.indexOf("http") != -1)
  {
    emailImage = "https://static.wixstatic.com/media/cafcd7_40c94dd7c0404bc898e8b4defa66e324~mv2.png"; // Fake button Contact Rule
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
  debugLog("Length buttonlink : " + buttonlink.length);

  // if (valueRadioSelectOfficial != arrayOfficial[0])
  if (buttonlink.length < 2000) // Do not display the button if the url length is too long
  {
    $w('#linkEmailClient').html = linkEmailClient;
    $w('#linkEmailClient').expand();
  }
  else
  {
    let buttonlink = `mailto:${textEmail}?subject=${textEmailSubject}&body=Please use the Clipboard to paste your letter here`;
    let linkEmailClient = '<a href="' + buttonlink + '">' + img + '</a>';
    $w('#linkEmailClient').html = linkEmailClient;
    $w('#linkEmailClient').expand();
  }
}

export function radioSelectMailType_change(event) {
	valueRadioSelectSECComment = $w("#radioSelectSECComment").value;
  debugLog("valueRadioSelectSECComment : " + valueRadioSelectSECComment);

  if (valueRadioSelectSECComment == "9999")
  {
    $w("#inputNbReasons").expand();
    $w("#textReasons").expand();
    $w("#imageWord").collapse();
    $w("#imageGoogleDoc").collapse();
    $w("#imageWTI").collapse();
    $w("#radioGroupOfficial").collapse();
    //$w("#buttonRefreshTemplate").collapse();
    $w("#buttonNewTemplate").collapse();
    $w('#textEmail').expand();
    $w('#textEmail').value = email;
    $w('#textEmailSubject').value = "";
    $w('#textEmailBody').value = "";
    $w("#radioGroupOfficial").selectedIndex = 1;
	  valueRadioSelectOfficial = $w("#radioGroupOfficial").value;
    getTemplate("SEC");
    setEmailBody(ReplaceRuleInfo(emailBody));
    $w("#buttonGenerateEmailLink").expand();
  }
  else
  {
    getTemplate("SEC");
    $w("#radioGroupOfficial").expand();
    $w("#buttonRefreshTemplate").expand();
    $w("#buttonNewTemplate").expand();
    $w("#buttonGenerateEmailLink").collapse();

    email = RuleInfos["Recipient"][arrayOfficial[0]][0];
    debugLog("RuleInfos[WordDoc] : " + JSON.stringify(RuleInfos["WordDoc"]));
    debugLog("RuleInfos[Federal_Register_Url] : " + JSON.stringify(RuleInfos["Federal_Register_Url"]));
    debugLog("RuleInfos[WordDoc][arrayOfficial[0]] : " + RuleInfos["WordDoc"][arrayOfficial[0]]);

    $w('#textOpenUntil').value = RuleInfos["OpenUntil"][arrayOfficial[0]][0];

    //if (!(RuleInfos["WordDoc"]) === undefined /* && !(RuleInfos["WordDoc"][arrayOfficial[0]]) === undefined */)
    if ((RuleInfos["WordDoc"][arrayOfficial[0]][0].indexOf("https://docs.google.com/") == -1))
    {
      debugLog("show imageWord : ");
      $w("#imageWord").link = RuleInfos["WordDoc"][arrayOfficial[0]][0];
      $w("#imageWord").expand();
    }
    
    if (RuleInfos.includes("Federal_Register_Url"))
    {
      debugLog("show imageFederalRegister : ");
      $w("#imageFederalRegister").link = RuleInfos["Federal_Register_Url"][arrayOfficial[0]][0];
      $w("#imageFederalRegister").expand();

    }
    else
    {
      $w("#imageFederalRegister").collapse();
    }
    
    if (RuleInfos.includes("SEC_Rule_Url"))
    {
      debugLog("show imageSEC : ");
      $w("#imageSEC").link = RuleInfos["SEC_Rule_Url"][arrayOfficial[0]][0];
      $w("#imageSEC").expand();
      $w("#textSECOverview").expand();

    }
    else
    {
      $w("#imageSEC").collapse();
      $w("#textSECOverview").collapse();
    }

    if (RuleInfos.includes("GoogleDoc"))
    {
      debugLog("show GoogleDoc : ");
      $w("#imageGoogleDoc").link = RuleInfos["WordDoc"][arrayOfficial[0]][0];
      $w("#imageGoogleDoc").expand();
    }

    if ((RuleInfos["Url"][arrayOfficial[0]][0].indexOf("https://www.urvin.finance/") != -1))
    {
      $w("#imageWTI").src = "https://static.wixstatic.com/media/cafcd7_b2c80e74c731403db9233955bbb2ab74~mv2.png";
    }
    {
      $w("#imageWTI").link = RuleInfos["Url"][arrayOfficial[0]][0];
      $w("#imageWTI").expand();
    }

    $w('#textEmail').value = email;
    $w('#textEmail').expand();
    setEmailSubject(ReplaceRuleInfo(emailSubject));
    setEmailBody(ReplaceRuleInfo(emailBody));
    GenerateEmailLink(); // Generate link for the Email Client
  }
  $w("#imageCopy").expand();
  $w("#textCopied").collapse();
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

export function radioGroupOfficial_change(event) {
	valueRadioSelectOfficial = $w("#radioGroupOfficial").value;
  debugLog("valueRadioSelectOfficial : " + valueRadioSelectOfficial);
  if (valueRadioSelectOfficial != arrayOfficial[0])
  {
    $w("#inputNbReasons").expand();
    $w("#textReasons").expand();
  }
  else
  {
    $w("#inputNbReasons").collapse();
    $w("#textReasons").collapse();
  }
  searchRule();
}

export function buttonGenerateEmailLink_click(event) {
	GenerateEmailLink();
}