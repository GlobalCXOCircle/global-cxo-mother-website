import HomePage from "@/components/home";
import Wrapper from "@/layouts/Wrapper";

export const metadata = {
  title: "Global CXO Circle | Enterprise Leadership Ecosystem & Membership",
  description: "Global CXO Circle is an exclusive leadership ecosystem and enterprise CXO membership network connecting top global executives to drive collaborative innovation and actionable outcomes.",
};
const page = () => {
  return (
    <Wrapper>
      <HomePage />
    </Wrapper>
  )
}

export default page