/* Branded receipt shown only after server verifies a paid Stripe PaymentIntent. */
(()=>{
 'use strict';
 const qs=new URLSearchParams(location.search);
 const id=qs.get('payment_intent')||'';
 const freeToken=qs.get('free_ebook_token')||'';
 const secret=qs.get('payment_intent_client_secret')||sessionStorage.getItem('ae_intent_'+id)||'';
 const API='https://gnfyidajbectlppsekzj.supabase.co/functions/v1/andre-embedded-checkout';
 const apiKey='sb_publishable_DGt4HrHAwWyMt-0Xtzlfog_F18RnOyf';
 const $=x=>document.getElementById(x);
 let expiresAtMs=0,expired=false,expiryTimer=null;
 const expiryMessage='This confirmation session has expired. Sign in to your portal to view your receipt and downloads.';
 function expireConfirmation(){
  if(expired)return;
  expired=true;
  if(expiryTimer){clearInterval(expiryTimer);expiryTimer=null}
  $('receipt-paid').hidden=true;
  $('receipt-loading').hidden=true;
  $('receipt-error').hidden=false;
  $('receipt-error').querySelector('h2').textContent='Confirmation session expired';
  $('receipt-error-message').textContent=expiryMessage;
  const link=$('receipt-error').querySelector('a');
  if(link){link.href='https://app.andreerving.com/';link.textContent='Sign in to your portal'}
  $('receipt-download').disabled=true;
  document.querySelectorAll('.receipt-ebook-download').forEach(a=>{a.removeAttribute('href');a.remove()});
  if(id)sessionStorage.removeItem('ae_intent_'+id);
  history.replaceState(null,'','checkout-success.html');
 }
 function armExpiry(iso){
  const timestamp=Date.parse(iso||'');
  if(!Number.isFinite(timestamp)){expireConfirmation();return false}
  expiresAtMs=timestamp;
  if(Date.now()>=expiresAtMs){expireConfirmation();return false}
  if(expiryTimer)clearInterval(expiryTimer);
  expiryTimer=setInterval(()=>{
   if(Date.now()>=expiresAtMs)expireConfirmation();
  },1000);
  return true;
 }
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&expiresAtMs&&Date.now()>=expiresAtMs)expireConfirmation();
 });
 const error=(message)=>{
  $('receipt-loading').hidden=true;
  $('receipt-error').hidden=false;
  $('receipt-error-message').textContent=message;
 };
 const money=(amount,currency)=>new Intl.NumberFormat('en-US',{style:'currency',currency:currency||'USD'}).format((Number(amount)||0)/100);
 const dateString=(d)=>new Date(d).toLocaleString('en-US',{dateStyle:'long',timeStyle:'short'});
 async function verify(){
  if(!freeToken&&(!/^pi_[A-Za-z0-9]+$/.test(id)||!secret.startsWith(id+'_secret_'))){
   error('For your privacy, please open this confirmation from the browser session where you completed checkout.');
   return;
  }
  try{
   const response=await fetch(API,{
    method:'POST',
    headers:{'Content-Type':'application/json',apikey:apiKey},
    body:JSON.stringify(freeToken?{action:'verify_free_ebook',token:freeToken}:{action:'verify_intent',intentId:id,clientSecret:secret})
   });
   const data=await response.json().catch(()=>null);
   if(response.status===410||data?.expired){expireConfirmation();return}
   if(!response.ok||!data)throw Error(data?.error||'Receipt verification is temporarily unavailable.');
   if(!armExpiry(data.expiresAt))return;
   if(data.payment_status!=='paid'||!data.receipt){
    error(data.payment_status==='processing'?'Your payment is still processing. Please check your email for confirmation.':'Stripe has not confirmed this payment as paid.');
    return;
   }
   const r=data.receipt;
   if(data.free){
    const heading=document.querySelector('.receipt-banner h1');if(heading)heading.textContent='Free eBook order confirmed';
    const lead=document.querySelector('.receipt-banner p');if(lead)lead.textContent='Your complimentary eBook order is complete. Access your download below when the file is available.';
   }
   if(r.appointmentStart&&Number.isFinite(new Date(r.appointmentStart).getTime())){
    $('receipt-appointment-time').textContent=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',dateStyle:'full',timeStyle:'short'}).format(new Date(r.appointmentStart))+' (Chicago time)';
    $('receipt-appointment').hidden=false;
   }
   const benefits=window.AE_PLAN_BENEFITS?.[data.productId];
   const inclusionPanel=$('receipt-inclusions'),inclusionList=$('receipt-benefits');
   if(Array.isArray(benefits)&&benefits.length&&inclusionPanel&&inclusionList){
    inclusionList.replaceChildren();
    for(const benefit of benefits){const li=document.createElement('li');li.textContent=benefit;inclusionList.append(li)}
    inclusionPanel.hidden=false;
   }
   $('receipt-number').textContent=r.orderNumber||'—';
   $('receipt-date').textContent=dateString(r.date);
   $('receipt-name').textContent=r.name||'Customer';
   $('receipt-email').textContent=r.email||'—';
   $('receipt-item').textContent=r.item||'Purchased item';
   $('receipt-line').textContent=money(r.amount,r.currency);
   $('receipt-total').textContent=money(r.amount,r.currency);
   $('receipt-loading').hidden=true;
   $('receipt-paid').hidden=false;
   if(data.download?.available&&data.download.url){
    const button=document.createElement('button');
    button.type='button';
    button.textContent='Download purchased eBook (PDF)';
    button.className='receipt-ebook-download';
    button.style.setProperty('color','#101010','important');
    button.addEventListener('click',async()=>{
     if(expired||!expiresAtMs||Date.now()>=expiresAtMs){expireConfirmation();return}
     button.disabled=true;button.textContent='Downloading eBook PDF…';
     const status=$('receipt-pdf-message');
     try{
      const response=await fetch(data.download.url,{cache:'no-store'});
      if(!response.ok)throw Error('The secure download could not be retrieved.');
      const file=await response.blob();
      const signature=new Uint8Array(await file.slice(0,5).arrayBuffer());
      if(String.fromCharCode(...signature)!=='%PDF-')throw Error('This eBook file is not a PDF. Please contact support for the correct format.');
      const filename=String(data.download.fileName||'Andre-Erving-eBook.pdf').replace(/[^a-zA-Z0-9_. -]/g,'_').replace(/\.[^.]+$/,'')+'.pdf';
      const url=URL.createObjectURL(new Blob([file],{type:'application/pdf'}));
      const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      if(status)status.hidden=true;
     }catch(e){
      if(status){status.textContent=e.message||'Unable to download this eBook PDF.';status.hidden=false}
     }finally{button.disabled=false;button.textContent='Download purchased eBook (PDF)'}
    });
    $('receipt-download').closest('.receipt-actions')?.prepend(button);


   }
   history.replaceState(null,'',freeToken?'checkout-success.html?free_ebook_token='+encodeURIComponent(freeToken):'checkout-success.html?payment_intent='+encodeURIComponent(id));
   $('receipt-download').addEventListener('click',()=>{if(expired||Date.now()>=expiresAtMs){expireConfirmation();return}void download(r)});
  }catch(e){error(e.message||'Unable to verify your payment.')}
 }

 // Brand design is shared by standard and dependency-free PDF paths.
 const FILE_PREFIX='Andre-Erving-Branded-Receipt-';
 const orderFile=r=>FILE_PREFIX+String(r.orderNumber||'order').replace(/[^A-Za-z0-9-]/g,'')+'.pdf';
 const isFree=r=>Number(r.amount)===0;
 const dateSafe=r=>{try{return dateString(r.date)}catch{return 'Date unavailable'}};
 async function loadBrandLogo(){
  // Use the complete royal blue and gold wordmark supplied for official receipts.
  // Rasterize the SVG at print resolution so both jsPDF and native PDF use identical branding.
  const svg=new Image();svg.crossOrigin='anonymous';
  svg.src='https://andreerving.com/images/logo.png';
  try{await svg.decode()}catch{throw new Error('The official Andre Erving receipt logo could not be loaded.')}
  const canvas=document.createElement('canvas');
  const width=1300,aspect=svg.naturalWidth/svg.naturalHeight;
  canvas.width=width;canvas.height=Math.max(1,Math.round(width/aspect));
  const context=canvas.getContext('2d');
  if(!context)throw new Error('Your browser could not prepare the official receipt logo.');
  context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(svg,0,0,canvas.width,canvas.height);
  const image=new Image();
  image.src=canvas.toDataURL('image/png');
  await image.decode();
  return image;
 }
 function drawBrandedReceipt(doc,r,logo){
  const navy=[13,34,61],blue=[31,78,169],gold=[207,159,57],muted=[102,121,144],line=[221,231,240];
  const fill=(rgb)=>doc.setFillColor(...rgb),ink=(rgb)=>doc.setTextColor(...rgb);
  const label=(txt,x,y)=>{doc.setFont('helvetica','bold');doc.setFontSize(9);ink(muted);doc.text(txt.toUpperCase(),x,y)};
  const value=(txt,x,y,width=430)=>{doc.setFont('helvetica','bold');doc.setFontSize(12);ink(navy);doc.text(doc.splitTextToSize(String(txt||'—'),width),x,y)};
  fill([255,255,255]);doc.rect(0,0,612,792,'F');
  // Branded masthead — official logo on white for accurate original colors.
  if(logo){
   const aspect=logo.naturalWidth/logo.naturalHeight, w=Math.min(328,75*aspect),h=w/aspect;
   try{doc.addImage(logo,'PNG',42,18,w,h,undefined,'FAST')}catch{throw new Error('Unable to embed official receipt logo in PDF')}
  }else{
   doc.setLineWidth(2.5);doc.setDrawColor(32,78,210);doc.roundedRect(42,31,43,43,11,11,'S');
   doc.setFont('helvetica','bold');doc.setFontSize(15);ink(blue);doc.text('AE',51,58);
   doc.setFontSize(17);ink(navy);doc.text('ANDRE ERVING',96,49);
   doc.setFontSize(8);ink(muted);doc.text('GROWTH  ·  STRATEGY  ·  EDUCATION',96,65);
  }
  doc.setFont('helvetica','bold');doc.setFontSize(9);ink(blue);
  doc.text('OFFICIAL ORDER RECEIPT',570,47,{align:'right'});
  doc.setFont('helvetica','normal');doc.setFontSize(8.5);ink(muted);
  doc.text('andreerving.com',570,62,{align:'right'});
  fill(gold);doc.rect(42,101,528,3,'F');
  // Receipt hero with clear order/payment status.
  fill(navy);doc.roundedRect(42,120,528,113,11,11,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(9);ink([242,199,111]);
  doc.text('ANDRE ERVING  /  PURCHASE CONFIRMATION',63,148);
  doc.setFontSize(24);ink([255,255,255]);
  doc.text(isFree(r)?'Complimentary order':'Payment receipt',63,184);
  doc.setFontSize(10);doc.setFont('helvetica','normal');ink([216,229,243]);
  doc.text(isFree(r)?'Confirmed  ·  No payment was charged':'Confirmed  ·  Payment processed securely',63,207);
  // Order identity.
  label('Order number',43,270);value(r.orderNumber||'—',43,289,248);
  label('Order date',337,270);value(dateSafe(r),337,289,225);
  doc.setDrawColor(...line);doc.line(42,313,570,313);
  label('Purchased by',43,341);value(r.name||'Customer',43,361,245);
  label('Email for receipt',337,341);value(r.email||'—',337,361,225);
  doc.setDrawColor(...line);doc.line(42,387,570,387);
  // Itemized table — space for a long offering name.
  doc.setFont('helvetica','bold');doc.setFontSize(12);ink(navy);doc.text('Purchase summary',43,417);
  fill([244,247,251]);doc.roundedRect(42,432,528,34,6,6,'F');
  label('Description',55,452);label('Qty',452,452);label('Amount',560,452);
  doc.setFont('helvetica','normal');doc.setFontSize(11);ink(navy);
  const item=doc.splitTextToSize(String(r.item||'Purchased item'),340).slice(0,3);
  doc.text(item,55,489);doc.text('1',453,489);
  doc.setFont('helvetica','bold');doc.text(money(r.amount,r.currency),559,489,{align:'right'});
  const rowEnd=493+(item.length-1)*15;
  doc.setDrawColor(...line);doc.line(42,rowEnd+17,570,rowEnd+17);
  fill([236,243,252]);doc.roundedRect(42,rowEnd+36,528,64,8,8,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(11);ink(navy);
  doc.text(isFree(r)?'TOTAL':'TOTAL PAID',59,rowEnd+74);
  doc.setFontSize(22);ink(blue);doc.text(money(r.amount,r.currency),553,rowEnd+77,{align:'right'});
  // Appointment details for coaching sales.
  if(r.appointmentStart){
   let appointment='';
   try{appointment=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',dateStyle:'full',timeStyle:'short'}).format(new Date(r.appointmentStart))+' (Chicago time)'}catch{}
   if(appointment){label('Scheduled coaching appointment',43,rowEnd+128);value(appointment,43,rowEnd+149,520)}
  }
  const baseline=685;
  doc.setDrawColor(...line);doc.line(42,baseline,570,baseline);
  doc.setFont('helvetica','bold');doc.setFontSize(9);ink(navy);doc.text('THANK YOU FOR CHOOSING ANDRE ERVING',43,705);
  doc.setFont('helvetica','normal');doc.setFontSize(9);ink(muted);
  doc.text('Growth. Strategy. Education. Your next step starts here.',43,722);
  doc.text('Support: andreerving.com/contact.html',43,744);
  doc.text('andreerving.com',570,744,{align:'right'});
  doc.setFontSize(7.5);doc.text('Andre Erving, LLC  ·  Official order confirmation',43,767);
  fill(gold);doc.rect(0,783,612,9,'F');
 }
 async function download(r){
  const button=$('receipt-download'),status=$('receipt-pdf-message');
  if(button.disabled||expired||!expiresAtMs||Date.now()>=expiresAtMs){if(Date.now()>=expiresAtMs)expireConfirmation();return}
  button.disabled=true;button.textContent='Preparing branded receipt…';
  try{
   const logo=await loadBrandLogo();
   if(window.jspdf?.jsPDF){
    const doc=new window.jspdf.jsPDF({unit:'pt',format:'letter',compress:true});
    drawBrandedReceipt(doc,r,logo);
    doc.save(orderFile(r));
   }else{
    downloadNativeBrandedPDF(r,logo);
   }
   if(status)status.hidden=true;
  }catch(e){
   console.error('Branded receipt generation error',e);
   try{const logo=await loadBrandLogo();downloadNativeBrandedPDF(r,logo);if(status)status.hidden=true}
   catch{
    if(status){status.textContent='Unable to prepare the PDF. Your order is confirmed; please try downloading again.';status.hidden=false}
   }
  }finally{button.disabled=false;button.textContent='Download PDF receipt'}
 }
 // Native PDF writer: same premium brand structure, with no external library or network dependency.
 function downloadNativeBrandedPDF(r,logo){
  const encoder=new TextEncoder(),parts=[],offsets=[0];
  const byteLength=()=>parts.reduce((n,x)=>n+x.length,0);
  const put=s=>parts.push(encoder.encode(s));
  const esc=s=>String(s??'').normalize('NFKD').replace(/[^\x20-\x7e]/g,' ').replace(/[\\()]/g,'\\$&').slice(0,200);
  const cmd=(s,x,y,fs=11,font='F1',rgb='0.07 0.16 0.27')=>rgb+' rg\nBT /'+font+' '+fs+' Tf 1 0 0 1 '+x+' '+y+' Tm ('+esc(s)+') Tj ET\n';
  const rect=(x,y,w,h,color)=>color+' rg\n'+x+' '+y+' '+w+' '+h+' re f\n';
  const outline=(x,y,w,h,color='0.86 0.90 0.94')=>color+' RG\n0.7 w\n'+x+' '+y+' '+w+' '+h+' re S\n';
  let imageBytes=null,imageSize=null;
  if(logo){
   try{
    const canvas=document.createElement('canvas');
    const aspect=logo.naturalWidth/logo.naturalHeight;
    canvas.width=Math.min(1200,Math.max(420,logo.naturalWidth));
    canvas.height=Math.max(1,Math.round(canvas.width/aspect));
    const ctx=canvas.getContext('2d');
    if(ctx){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
     ctx.drawImage(logo,0,0,canvas.width,canvas.height);
     const encoded=canvas.toDataURL('image/jpeg',.92).split(',')[1];
     const binary=atob(encoded),bytes=new Uint8Array(binary.length);
     for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
     imageBytes=bytes;imageSize={width:canvas.width,height:canvas.height}
    }
   }catch(e){console.warn('Native PDF using vector brand mark',e)}
  }
  let content='';
  content+=rect(0,0,612,792,'1 1 1');
  content+=rect(42,685,528,3,'0.81 0.62 0.22');
  // Official AE mark in brand palette, not plain wordmark text.
  if(imageBytes&&imageSize){
   const displayedWidth=330,displayedHeight=Math.min(76,displayedWidth*imageSize.height/imageSize.width);
   content+='q '+displayedWidth+' 0 0 '+displayedHeight+' 42 '+(699+(76-displayedHeight)/2)+' cm /BrandLogo Do Q\n';
  }else{
   content+=outline(42,706,47,47,'0.12 0.31 0.83');
   content+=rect(42,706,47,3,'0.81 0.62 0.22');
   content+=cmd('AE',51,722,17,'F2','0.12 0.31 0.83');
   content+=cmd('ANDRE ERVING',101,734,19,'F2');
   content+=cmd('GROWTH  |  STRATEGY  |  EDUCATION',101,718,8,'F2','0.37 0.45 0.56');
  }
  content+=cmd('OFFICIAL ORDER RECEIPT',444,741,8,'F2','0.12 0.31 0.68');
  content+=cmd('andreerving.com',482,720,8,'F1','0.37 0.45 0.56');
  content+=rect(42,557,528,113,'0.05 0.13 0.24');
  content+=cmd('ANDRE ERVING  /  PURCHASE CONFIRMATION',63,639,9,'F2','0.94 0.77 0.44');
  content+=cmd(isFree(r)?'Complimentary order':'Payment receipt',63,601,23,'F2','1 1 1');
  content+=cmd(isFree(r)?'Confirmed  |  No payment was charged':'Confirmed  |  Payment processed securely',63,577,10,'F1','0.83 0.89 0.97');
  const lab=(t,x,y)=>cmd(t.toUpperCase(),x,y,9,'F2','0.42 0.50 0.61');
  content+=lab('Order number',43,520)+cmd(r.orderNumber||'—',43,501,11,'F2');
  content+=lab('Order date',337,520)+cmd(dateSafe(r),337,501,11,'F2');
  content+=rect(42,474,528,1,'0.87 0.91 0.95');
  content+=lab('Purchased by',43,454)+cmd(r.name||'Customer',43,434,11,'F2');
  content+=lab('Receipt email',337,454)+cmd(r.email||'—',337,434,10,'F2');
  content+=rect(42,409,528,1,'0.87 0.91 0.95');
  content+=cmd('Purchase summary',43,382,13,'F2');
  content+=rect(42,330,528,35,'0.95 0.97 0.99');
  content+=lab('Description',55,342)+lab('Qty',453,342)+lab('Amount',510,342);
  const product=String(r.item||'Purchased item'),first=product.slice(0,53),second=product.length>53?product.slice(53,100):'';
  content+=cmd(first,55,304,10);if(second)content+=cmd(second,55,289,10);
  content+=cmd('1',454,304,11);
  content+=cmd(money(r.amount,r.currency),505,304,11,'F2');
  content+=rect(42,269,528,1,'0.87 0.91 0.95');
  content+=rect(42,182,528,69,'0.92 0.95 0.99');
  content+=cmd(isFree(r)?'TOTAL':'TOTAL PAID',58,207,12,'F2');
  content+=cmd(money(r.amount,r.currency),435,205,21,'F2','0.12 0.30 0.66');
  if(r.appointmentStart){try{const d=new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Chicago'}).format(new Date(r.appointmentStart));content+=lab('Coaching appointment - Chicago time',43,156)+cmd(d,43,137,10,'F2')}catch{}}
  content+=rect(42,106,528,1,'0.87 0.91 0.95');
  content+=cmd('THANK YOU FOR CHOOSING ANDRE ERVING',43,89,9,'F2');
  content+=cmd('Growth. Strategy. Education. Your next step starts here.',43,74,8,'F1','0.42 0.50 0.61');
  content+=cmd('andreerving.com/contact.html',43,54,8,'F1','0.42 0.50 0.61');
  content+=cmd('andreerving.com',476,54,8,'F2','0.42 0.50 0.61');
  content+=cmd('Andre Erving, LLC  |  Official order confirmation',43,30,7,'F1','0.42 0.50 0.61');
  content+=rect(0,0,612,9,'0.81 0.62 0.22');
  const stream=encoder.encode(content);
  put('%PDF-1.4\n');
  const objects=[
   '<< /Type /Catalog /Pages 2 0 R >>',
   '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
   '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> '+(imageBytes?' /XObject << /BrandLogo 7 0 R >>':'')+' >> /Contents 6 0 R >>',
   '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
   '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
   null,
   imageBytes?'<< /Type /XObject /Subtype /Image /Width '+imageSize.width+' /Height '+imageSize.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+imageBytes.length+' >>':undefined
  ].filter(x=>x!==undefined);
  for(let i=0;i<objects.length;i++){
   offsets.push(byteLength());put((i+1)+' 0 obj\n');
   if(i===5){put('<< /Length '+stream.length+' >>\nstream\n');parts.push(stream);put('\nendstream')}
   else if(i===6){put(objects[i]+'\nstream\n');parts.push(imageBytes);put('\nendstream')}
   else put(objects[i]);put('\nendobj\n');
  }
  const start=byteLength();put('xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n');
  for(let i=1;i<offsets.length;i++)put(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
  put('trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n');
  const blob=new Blob(parts,{type:'application/pdf'}),url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=orderFile(r);
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }

 void verify();
})();