document.getElementById("consultForm").addEventListener("submit", function(e){
  e.preventDefault();
  const f=new FormData(this);
  const subject=encodeURIComponent("Consultation enquiry from "+(f.get("name")||"Website visitor"));
  const body=encodeURIComponent(
    "Name: "+f.get("name")+"\nWhatsApp: +91 "+f.get("phone")+
    "\nEmail: "+f.get("email")+"\nService: "+f.get("service")+
    "\nLanguage: "+f.get("language")+"\nPreferred time: "+f.get("time")+
    "\n\nMessage:\n"+f.get("message")
  );
  window.location.href="mailto:kmsubramanian@gmail.com?subject="+subject+"&body="+body;
});
