// Velo API Reference: https://www.wix.com/velo/reference/api-overview/introduction

import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { getResults } from 'backend/google-sheets';

var Templates;
var RecordHolder_Index = 1;
var TransferAgent_Defined = "";
var CompanyInfos;
var CompaniesInfos;
var lastSearch = "";
var debug_mode = true;

$w.onReady(async function () {

  let query_ticker = wixLocation.query['ticker'];
  if (!( query_ticker === undefined)) // Check if the parameter ticker is filled on the url
  {
    query_ticker = query_ticker.toUpperCase().trim();
    $w("#inputSearchCompany").value = query_ticker;
    debugLog("Ticker defined : " + query_ticker);
  }
  $w('#inputYourName').value = "John Doe"; // Default value for inputYourName

  $w('#inputIRNbShares').value = "2"; // Default value for inputIRNbShares
  $w('#textIRBroker').value = "Interactive Brokers"; // Default value for textIRBroker
  $w('#textIRBroker').collapse(); // Hide field textIRBroker
  $w('#inputIRNbSharesBroker').collapse(); // Hide field inputIRNbSharesBroker

  $w('#textIREmail').readOnly = true;
  $w('#textIREmailSubject').readOnly = true;
  $w('#textIREmailBody').readOnly = true;

  // Mapping for listAutocompleteTicker
  $w('#listAutocompleteTicker').onItemReady( ($w, itemData, index) => {
    const textTicker = $w('#textAutocompleteTicker');
    textTicker.text = itemData.ticker;
    const textCompany = $w('#textAutocompleteTickerCompany');
    textCompany.text = itemData.company;
  });
  $w("#listAutocompleteTicker").collapse(); // Hide field listAutocompleteTicker

  $w('#buttonSearchCompany').collapse(); // Hide field buttonSearchCompany
  $w('#imageLoading').expand(); // Display field imageLoading
  registerHandlers(); // Register events on buttons and so on...
  getCompanies(); // Retrieve Companies Infos
  getTemplates("IR"); // Retrieve Templates
});

// Register events on buttons and so on...
function registerHandlers() {
  $w('#buttonSearchCompany').onClick(() => searchCompany());
  $w('#buttonNewTemplate').onClick(() => searchCompany());
  $w('#buttonRefreshTemplate').onClick(() => searchCompany());
  $w('#radioRecordHolder').onChange(() => radioRecordHolder_change());
}

function debugLog(content) {
  if (debug_mode == true)
  {
    console.log(content);
  }
}

const setIRemail = async(content) =>
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
  $w('#textIREmail').value = content;
  $w('#textIREmail').expand();
}

const setIREmailSubject = async(content) =>
{
  if (content.length == 0)
  {
    content = "Not available";
  }
  $w('#textIREmailSubject').value = content;
  $w('#textIREmailSubject').expand();
  $w('#buttonNewTemplate').expand();
  $w('#buttonRefreshTemplate').expand();
  $w('#linkEmailClient').expand();
}

const setIREmailBody = async(content) =>
{
  if (content.length == 0)
  {
    content = "Not available";
  }
  $w('#textIREmailBody').value = content;
  $w('#textIREmailBody').expand();
  if (!( CompanyInfos[5] === undefined ) && CompanyInfos[5] != "") // DRS number already provided by the company, do not send email
  {
   // $w('#linkEmailClient').collapse();
    $w('#buttonNewTemplate').collapse();
    $w('#buttonRefreshTemplate').collapse();
  }
  else
  {
    $w('#linkEmailClient').expand();
    $w('#buttonNewTemplate').expand();
    $w('#buttonRefreshTemplate').expand();
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
  if (!( CompanyInfos === undefined ) )
  {
    if (!( CompanyInfos[5] === undefined ) && CompanyInfos[5] != "") // DRS number already provided by the company
    {
      let outstandingShares = CompanyInfos[4];
      let DRSShares = CompanyInfos[5];
      let percent_DRSShares = CompanyInfos[6];
      let sentence = "Outstanding Shares - " + outstandingShares + "\rDirectly Registered Shares - " + DRSShares + "\r% of Outstanding DRS - " + percent_DRSShares;
      return sentence;
    }
    else
    {
      let nbShares = $w('#inputIRNbShares').value;
      let nbSharesBroker = $w('#inputIRNbSharesBroker').value;
      let broker = $w('#textIRBroker').value;
      let yourName = $w('#inputYourName').value;
    
      if (yourName.length > 0)
      {
        source = strReplaceAll(source, "**YOUR_NAME**", yourName);
      }
      if (broker.length > 0)
      {
        source = strReplaceAll(source, "**BROKER**", broker);
      }
      if (parseInt(nbShares) > 0)
      {
        source = strReplaceAll(source, "**NB_SHARES**", nbShares);
      }
      if (parseInt(nbSharesBroker) > 0)
      {
        source = strReplaceAll(source, "**NB_SHARES_BROKER**", nbSharesBroker);
      }
      if (CompanyInfos[1].length > 0)
      {
        source = strReplaceAll(source, "**COMPANY**", CompanyInfos[1]);
      }
      source = strReplaceAll(source, "**TRANSFERT_AGENT**", CompanyInfos[2]);

      source = strReplaceAll(source, " .", ".");
      source = strReplaceAll(source, " ,", ".");
      source = strReplaceAll(source, ",,", ",");
      source = strReplaceAll(source, ":.", ".");
      source = strReplaceAll(source, ".,", ".");
      source = strReplaceAll(source, "!.", ".");
      source = strReplaceAll(source, "..", ".");
      source = strReplaceAll(source, "<", "");
    }
  }
  return source;
}

const getTemplates = async(template_filter_recipient = "") => {
  let startDate = Math.floor(Date.now() / 1000);
  debugLog("Start getTemplates : " + startDate);
	let selectedIndex = $w("#radioRecordHolder").selectedIndex;
  if (Templates === undefined || RecordHolder_Index != selectedIndex || (CompanyInfos[2] != TransferAgent_Defined) )
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
      var TemplateRecordHolder = result.data.values[i][4];
      var TemplateTA = result.data.values[i][5];
      var TemplateContent = result.data.values[i][6];
    
      if ( !(TemplateContent === undefined ) && TemplateContent != "" && ( template_filter_recipient == "" || template_filter_recipient == TemplateRecipient ) )
      {
        if (! Templates[TemplateType])
        {
          Templates[TemplateType] = new Array();
        }
        if (TemplateType == "Body1")
        {
          if (selectedIndex == TemplateRecordHolder) // Retrieve Templates for the Selected Record Holder...
          {
            if (CompanyInfos === undefined)
            {
              if (TemplateTA == 0) // Initialization with Transfer Agent undefined
              {
                Templates[TemplateType].push( TemplateContent );
              }
            }
            else
            {
              if (CompanyInfos[2] != "") // Transfer Agent Defined
              {
                Templates[TemplateType].push( TemplateContent );
              }
              if (CompanyInfos[2] == "" && TemplateTA == 0) // Transfer Agent Undefined
              {
                Templates[TemplateType].push( TemplateContent );
              }
            }
          }
        }
        else
        {
          Templates[TemplateType].push( TemplateContent );
        }
      }
    }
  }
  let endDate = Math.floor(Date.now() / 1000);
  debugLog("End getTemplates : " + endDate);
  debugLog("Duration getTemplates : " + ( endDate - startDate ).toString());
}

const getTemplate = async(template_filter_recipient = "") =>
{
  let inputSearchCompany = $w('#inputSearchCompany').value;

  if (Templates === undefined && inputSearchCompany.length >= 1)
  {
    await getTemplates(template_filter_recipient);
  }
  
  if (!( Templates === undefined ) && !( Templates["Subject"] === undefined ))
  {
    var subject_style = Math.floor(Math.random()*(Templates["Subject"].length));
    var greeting_style = Math.floor(Math.random()*(Templates["Greeting"].length));
    var body1_style = Math.floor(Math.random()*(Templates["Body1"].length));
    var body2_style = Math.floor(Math.random()*(Templates["Body2"].length));
    var body3_style = Math.floor(Math.random()*(Templates["Body3"].length));
    var goodbye_style = Math.floor(Math.random()*(Templates["Goodbye"].length));
    var body_style = greeting_style + "_" + body1_style + "_" + body2_style + "_" + body3_style + "_" + goodbye_style;

    debugLog("body_style : " + body_style);
    var subject = Templates["Subject"][subject_style];
    var body = Templates["Greeting"][greeting_style] + ",\r\r" + Templates["Body1"][body1_style] + "\r\r" + Templates["Body2"][body2_style] + "\r\r" + Templates["Body3"][body3_style] + "\r\r" + Templates["Goodbye"][goodbye_style] + "\r**YOUR_NAME**";;

    var values = [ subject, body ];
    return values;
  }
}

const getCompanies = async() => {
  if (!( CompaniesInfos === undefined )) // Companies not yet filled
  {
    return;
  }
  let startDate = Math.floor(Date.now() / 1000);
  debugLog("Start getResults : " + startDate);
  if (CompaniesInfos === undefined) // Fill Companies
  {
    CompaniesInfos = await getResults("Full_Database_Backend!A2:AR10000");
  }
  let endDate = Math.floor(Date.now() / 1000);
  debugLog("End getResults : " + endDate);
  debugLog("Duration getResults : " + ( endDate - startDate ).toString());
  
  $w('#buttonSearchCompany').expand();
  $w('#imageLoading').collapse();
  if ($w('#inputSearchCompany').value.length >= 1)
  {
    await searchCompany();
  }
}

const searchCompany = async() => {
  $w("#listAutocompleteTicker").collapse();
  let inputSearchCompany = $w('#inputSearchCompany').value;
  inputSearchCompany = inputSearchCompany.toUpperCase();

  let response = "Not found";
  let found = false;

  if (inputSearchCompany.length >= 1)
  {
    await getCompanies();

    let startDate = Math.floor(Date.now() / 1000);
    debugLog("Start Searching : " + startDate);
    debugLog("lastSearch : " + lastSearch);
    debugLog("inputSearchCompany : " + inputSearchCompany);
    for (let i = 0; i < CompaniesInfos.data.values.length && !found; i++)
    {
      let value = "" + CompaniesInfos.data.values[i][0];
      value = value.toUpperCase();
      if (value == inputSearchCompany) // Search the exact name for the ticker
      {
        found = true;
        debugLog("CompaniesInfos.data.values : " + JSON.stringify(CompaniesInfos.data.values[i]));
        CompanyInfos = [
          CompaniesInfos.data.values[i][0],  // 0  A Ticker
          CompaniesInfos.data.values[i][2],  // 1  B  Company Name
          CompaniesInfos.data.values[i][3],  // 2  D  TA
          CompaniesInfos.data.values[i][8],  // 3  I  CR email
          CompaniesInfos.data.values[i][13], // 4  N  outstandingSharesv
          CompaniesInfos.data.values[i][19], // 5  T  DRSShares
          CompaniesInfos.data.values[i][20]  // 6  U  percent_DRSShares
          ];
        debugLog("CompanyInfos : " + JSON.stringify(CompanyInfos));
        if (CompanyInfos[2] != TransferAgent_Defined)
        {
          await getTemplates("IR");
          TransferAgent_Defined = CompanyInfos[2];
        }
        response = CompaniesInfos.data.values[i][8]; // IR Contact
      }
    }
    let endDate = Math.floor(Date.now() / 1000);
    debugLog("End Searching : " + endDate);
    debugLog("Duration Searching : " + ( endDate - startDate ).toString());
    lastSearch = inputSearchCompany;

    await setIRemail(response);
    
  }
  let valuesIRemail = await getTemplate("IR");
  if (!( valuesIRemail === undefined ) && valuesIRemail.length > 0)
  {
    await setIREmailSubject(ReplaceCompanyInfo(valuesIRemail[0]));
    await setIREmailBody(ReplaceCompanyInfo(valuesIRemail[1]));
  }
  await GenerateEmailLink(); // Generate link for the Email Client
}

const GenerateEmailLink = async() => {
  let textIREmail = $w('#textIREmail').value;
  let textIREmailSubject = $w('#textIREmailSubject').value;
  let textIREmailBody = $w('#textIREmailBody').value;

  textIREmailSubject = encodeURIComponent(textIREmailSubject);
  textIREmailBody = encodeURIComponent(textIREmailBody);
  textIREmailBody = strReplaceAll(textIREmailBody, "%0D", "%0D%0A"); // Replace caracter %0D by %0D%0A in order to display Carriage Return on mobile
  
  let buttonIRlink = `mailto:${textIREmail}?subject=${textIREmailSubject}&body=${textIREmailBody}`;
  let isMobile = false;

  let emailImage ="https://static.wixstatic.com/media/cafcd7_e3212f954a434bce814a1475259b43fd~mv2.png"; // Fake button Email Client
  let img = '<img src="' + emailImage + '" alt="Email Client" width="324px" height="49px">';
  if (navigator.userAgent.toLowerCase().match(/mobile/i))
  {
    isMobile = true;
    img = '<img src="' + emailImage + '" alt="Email Client" width="280px" height="40px">'; // Email Icon
    //emailImage ="https://static.wixstatic.com/media/cafcd7_5a3456e04ff24ce78cbf9ed00a6a9c7b~mv2.gif"; // Email Icon
    //img = '<img src="' + emailImage + '" alt="Email Client" width="50" height="50">'; // Email Icon
  }
  let linkEmailClient = '<a href="' + buttonIRlink + '">' + img + '</a>';
  
  $w("#textCopied").collapse();
  if (!( CompanyInfos[5] === undefined ) && CompanyInfos[5] != "") // DRS number already provided by the company, do not send email
  {
    linkEmailClient = "";
    $w('#linkEmailClient').html = linkEmailClient;
    $w("#imageCopy").collapse();
  }
  else
  {
    $w('#linkEmailClient').html = linkEmailClient;
    $w('#linkEmailClient').expand();
    $w("#imageCopy").expand();
  }
}

export function inputSearchCompany_keyPress(event) {
  $w("#listAutocompleteTicker").data = [];
  $w("#listAutocompleteTicker").collapse();

  setTimeout(() => {
    let inputSearchCompany = $w('#inputSearchCompany').value;
    inputSearchCompany = inputSearchCompany.toUpperCase();
    debugLog("inputSearchCompany : " + inputSearchCompany);

    if (inputSearchCompany.length == 0 || ( CompaniesInfos === undefined ) || lastSearch == inputSearchCompany)
    {
      return; // ignore if empty
    }
    
    let predictions = [];
    let predictionsTickers = [];
    inputSearchCompany = inputSearchCompany.trim();

    let startDate = Math.floor(Date.now() / 1000);
    debugLog("Start Autocomplete : " + startDate);

    // Search in tickers names
    for (let i = 0; i < CompaniesInfos.data.values.length && predictionsTickers.length <= 3; i++)
    {
      let valueTicker = "" + CompaniesInfos.data.values[i][0];
      valueTicker = valueTicker.toUpperCase().trim();
      if (valueTicker.indexOf(inputSearchCompany) != -1)
      {
        if (predictionsTickers.includes(CompaniesInfos.data.values[i][0]) == false && predictionsTickers.length <= 3)
        {
          predictionsTickers.push(CompaniesInfos.data.values[i][0]);
          let values = [ CompaniesInfos.data.values[i][0], CompaniesInfos.data.values[i][2] ];
          predictions.push(values);
        }
      }
    }

    // Search in Companies names
    for (let i = 0; i < CompaniesInfos.data.values.length && predictionsTickers.length <= 3; i++)
    {
      let valueCompany = "" + CompaniesInfos.data.values[i][2];
      valueCompany = valueCompany.toUpperCase().trim();
      if (valueCompany.indexOf(inputSearchCompany) != -1)
      {
        if (predictionsTickers.includes(CompaniesInfos.data.values[i][0]) == false && predictionsTickers.length <= 3)
        {
          predictionsTickers.push(CompaniesInfos.data.values[i][0]);
          let values = [ CompaniesInfos.data.values[i][0], CompaniesInfos.data.values[i][2] ];
          predictions.push(values);
        }
      }
    }

    let suggestions = [];
    predictions.forEach(function (prediction)
    {
      let id = strReplaceAll(prediction[0], " ", "-");
      let item = { "_id": id, "ticker": prediction[0], "company": prediction[1] };
      suggestions.push(item);
    });
    $w("#listAutocompleteTicker").data = suggestions; // add the suggestions to the repeater
    $w("#listAutocompleteTicker").expand();	// we have data so we can expand the repeater

    let endDate = Math.floor(Date.now() / 1000);
    debugLog("End Autocomplete: " + endDate);
    debugLog("Duration Autocomplete : " + ( endDate - startDate ).toString());
    
    lastSearch = inputSearchCompany;
  }, 10);
}

export function containerAutocompleteTickers_click(event, $w)
{
  let textAutocompleteTicker = $w("#textAutocompleteTicker").text
  debugLog("textAutocompleteTicker : " + textAutocompleteTicker);
  $w("#inputSearchCompany").value = $w("#textAutocompleteTicker").text;
  
  $w("#listAutocompleteTicker").collapse();
  searchCompany();
}

const radioRecordHolder_change = async() => {
	let selectedIndex = $w("#radioRecordHolder").selectedIndex;
  if (selectedIndex != RecordHolder_Index)
  {
    $w('#imageLoading').expand();
    await getTemplates("IR");
    RecordHolder_Index = selectedIndex;
    debugLog("radioRecordHolder : " + selectedIndex);
    if (RecordHolder_Index == 0)
    {
      $w("#textIRBroker2").expand();
      $w("#textIRBroker").expand();
      $w("#textIRSharesBroker").collapse();
      $w("#inputIRNbSharesBroker").collapse();
    }
    else if (RecordHolder_Index == 2)
    {
      $w("#textIRBroker2").expand();
      $w("#textIRBroker").expand();
      $w("#textIRSharesBroker").expand();
      $w("#inputIRNbSharesBroker").expand();
    }
    else
    {
      $w("#textIRBroker2").collapse();
      $w("#textIRBroker").collapse();
      $w("#textIRSharesBroker").collapse();
      $w("#inputIRNbSharesBroker").collapse();
    }
    await searchCompany();
    $w('#imageLoading').collapse();
  }
}

export function imageCopy_click(event) {

  let textEmailBody = $w('#textIREmailBody').value;

  wixWindow.copyToClipboard(textEmailBody)
  .then( () => {
    $w("#textCopied").expand();
  } )
  .catch( (err) => {
    // handle case where an error occurred
  } );
}