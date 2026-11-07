// Contact-page contextual fields. Main form submission is handled by main.js.
(()=>{
 const form=document.querySelector('.ae-contact-detailed-form');
 if(!form)return;
 const topic=form.querySelector('#ae-contact-topic');
 const date=form.querySelector('#ae-contact-event-wrap');
 const order=form.querySelector('#ae-contact-order-wrap');
 const dateInput=date?.querySelector('input');
 const orderInput=order?.querySelector('input');
 const eventTopics=new Set(['Speaking & Workshops','Photography','Coaching & Mentorship']);
 const orderTopics=new Set(['Orders & Billing','Account Support','Courses / Training']);
 function update(){
  const value=topic.value;
  const showDate=eventTopics.has(value),showOrder=orderTopics.has(value);
  date.hidden=!showDate;order.hidden=!showOrder;
  if(!showDate&&dateInput)dateInput.value='';
  if(!showOrder&&orderInput)orderInput.value='';
 }
 topic.addEventListener('change',update);
 form.addEventListener('reset',()=>queueMicrotask(update));
 update();
})();
