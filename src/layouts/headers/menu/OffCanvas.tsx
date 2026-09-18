import Image from "next/image"
import Link from "next/link"
import ProtectedEmail from "@/components/common/ProtectedEmail";
import InjectableSvg from "@/components/common/InjectableSvg";
import Icon from "@/components/common/Icon";

import logo from "@/assets/img/logo/logo.svg"
import insta_img1 from "@/assets/img/images/footer_insta01.jpg"
import insta_img2 from "@/assets/img/images/footer_insta02.jpg"
import insta_img3 from "@/assets/img/images/footer_insta03.jpg"
import insta_img4 from "@/assets/img/images/footer_insta04.jpg"
import insta_img5 from "@/assets/img/images/footer_insta05.jpg"
import insta_img6 from "@/assets/img/images/footer_insta06.jpg"
import close_icon from "@/assets/img/icons/times.svg"

interface MobileSidebarProps {
   offCanvas: boolean;
   setOffCanvas: (offCanvas: boolean) => void;
}

const OffCanvas = ({ offCanvas, setOffCanvas }: MobileSidebarProps) => {

   return (
      <>
         <div className={`offCanvas__info ${offCanvas ? "active" : ""}`}>
            <div className="offCanvas__close-icon menu-close">
               <button onClick={() => setOffCanvas(false)}><InjectableSvg src={close_icon.src} className="injectable" alt="Instagram" /></button>
            </div>
            <div className="offCanvas__logo mb-30">
               <Link href="/"><Image src={logo} alt="Logo" /></Link>
            </div>
            <div className="offCanvas__content">
               <p>Businorem ipsum dolor sit amet cons interdum quam duis variuy time honored tradition etting .</p>
            </div>
            <div className="offCanvas__img">
               <ul className="list-wrap">
                  <li><Link href="/#contact"><Image src={insta_img1} alt="img" /></Link></li>
                  <li><Link href="/#contact"><Image src={insta_img2} alt="img" /></Link></li>
                  <li><Link href="/#contact"><Image src={insta_img3} alt="img" /></Link></li>
                  <li><Link href="/#contact"><Image src={insta_img4} alt="img" /></Link></li>
                  <li><Link href="/#contact"><Image src={insta_img5} alt="img" /></Link></li>
                  <li><Link href="/#contact"><Image src={insta_img6} alt="img" /></Link></li>
               </ul>
            </div>
            <div className="offCanvas__side-info">
               <div className="contact-list">
                  <i className="flaticon-placeholder"></i>
                  <p>Bangalore, India</p>
               </div>
               <div className="contact-list">
                  <i className="flaticon-telephone"></i>
                  <Link href="tel:+919845845616">+91 98458 45616</Link>
               </div>
               <div className="contact-list">
                  <i className="flaticon-envelope"></i>
                  <ProtectedEmail user="contactus" domain="globalcxocircle.com" />
               </div>
            </div>
            <div className="offCanvas__social">
               <h6 className="title">Follow us</h6>
               <ul className="list-wrap">
                  <Icon />
               </ul>
            </div>
         </div>
         <div onClick={() => setOffCanvas(false)} className={`offCanvas__overly ${offCanvas ? "active" : ""}`}></div>
      </>
   )
}

export default OffCanvas