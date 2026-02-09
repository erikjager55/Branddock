import { NextResponse } from "next/server";
import { auth } from "@/../auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      data: [
        {
          id: "brand-perception",
          name: "Brand Perception",
          description: "Questions about brand awareness and perception",
          questions: [
            "How would you describe our brand in three words?",
            "What emotions does our brand evoke?",
            "How does our brand compare to competitors?",
            "What is the first thing that comes to mind when you think of our brand?",
            "How likely are you to recommend our brand to others?",
          ],
        },
        {
          id: "customer-experience",
          name: "Customer Experience",
          description: "Questions about customer journey and satisfaction",
          questions: [
            "Describe your most recent experience with our product/service.",
            "What aspects of our service exceeded your expectations?",
            "Where did our service fall short of your expectations?",
            "How easy was it to accomplish your goal?",
            "What would you change about your experience?",
          ],
        },
        {
          id: "product-feedback",
          name: "Product Feedback",
          description: "Questions about product features and usability",
          questions: [
            "Which features do you use most frequently?",
            "Which features do you find most valuable?",
            "What features are missing that you wish existed?",
            "How intuitive is our product to use?",
            "How well does our product solve your core problem?",
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching interview templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch interview templates" },
      { status: 500 }
    );
  }
}
