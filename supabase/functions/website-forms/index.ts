const headers={"content-type":"application/json","access-control-allow-methods":"POST, OPTIONS","access-control-allow-headers":"content-type, apikey, authorization"};
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 const allowed=["https://www.andreerving.com","https://andreerving.com"];
 const h={...headers,"access-control-allow-origin":allowed.includes(origin)?origin:"null","vary":"Origin"};
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:h});
 if(req.method!=="POST"||!allowed.includes(origin))return Response.json({error:"Request not allowed"},{status:403,headers:h});
 try{
  const body=await req.json();
  if(body.website||JSON.stringify(body).length>12000)return Response.json({error:"Invalid request"},{status:400,headers:h});
  const email=String(body.email||"").trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return Response.json({error:"Invalid email"},{status:400,headers:h});
  const kind=body.kind==="contact"?"contact":body.kind==="newsletter"?"newsletter":null;
  if(!kind)return Response.json({error:"Invalid request"},{status:400,headers:h});
  const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!base||!key)return Response.json({error:"Service unavailable"},{status:503,headers:h});
  const endpoint=kind==="contact"?"website_inquiries":"newsletter_signups";
  const name=String(body.name||"").trim(),message=String(body.message||"").trim();
  if(kind==="contact"&&(!name||!message||name.length>160||message.length>5000))return Response.json({error:"Name and message are required"},{status:400,headers:h});
  const payload=kind==="contact"?{name,email,phone:String(body.phone||"").slice(0,80),interest:String(body.interest||"").slice(0,100),message}:{email,consent:body.consent===true};
  if(kind==="newsletter"&&!payload.consent)return Response.json({error:"Consent required"},{status:400,headers:h});
  const result=await fetch(base+"/rest/v1/"+endpoint,{method:"POST",headers:{"apikey":key,"authorization":"Bearer "+key,"content-type":"application/json","prefer":"return=minimal"},body:JSON.stringify(payload)});
  if(!result.ok&&!(kind==="newsletter"&&result.status===409))return Response.json({error:"Unable to save request"},{status:502,headers:h});
  return Response.json({ok:true},{headers:h});
 }catch{return Response.json({error:"Invalid submission"},{status:400,headers:h})}
});