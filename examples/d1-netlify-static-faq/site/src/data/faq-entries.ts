import type { FaqEntry } from '../lib/visible-answer';

export const faqEntries: readonly FaqEntry[] = [
  {
    "id": "what-is-an-ein",
    "question": "What is an EIN?",
    "quotations": [
      {
        "sourceUrl": "https://www.irs.gov/businesses/small-businesses-self-employed/employer-id-numbers",
        "blocks": [
          {
            "kind": "paragraph",
            "text": "An EIN is a federal tax ID number for businesses, tax-exempt organizations and other entities."
          }
        ]
      }
    ]
  },
  {
    "id": "does-an-ein-cost-anything",
    "question": "Does an EIN cost anything?",
    "quotations": [
      {
        "sourceUrl": "https://www.irs.gov/businesses/small-businesses-self-employed/employer-id-numbers",
        "blocks": [
          {
            "kind": "paragraph",
            "text": "You can get an EIN for free directly from the IRS in minutes. Apply online."
          }
        ]
      },
      {
        "sourceUrl": "https://www.irs.gov/businesses/small-businesses-self-employed/get-an-employer-identification-number",
        "blocks": [
          {
            "kind": "paragraph",
            "text": "Beware of websites that charge for an EIN. You never have to pay a fee for an EIN."
          }
        ]
      }
    ]
  },
  {
    "id": "who-needs-an-ein",
    "question": "Who needs an EIN?",
    "quotations": [
      {
        "sourceUrl": "https://www.irs.gov/businesses/small-businesses-self-employed/employer-id-numbers",
        "blocks": [
          {
            "kind": "items",
            "intro": "You need an EIN if you:",
            "items": [
              "Have employees",
              "Will need to pay employment, excise or alcohol, tobacco, and firearms taxes",
              "Withhold taxes on income, other than wages, paid to a non-resident alien"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "how-do-you-apply-for-an-ein-online",
    "question": "How do you apply for an EIN online?",
    "quotations": [
      {
        "sourceUrl": "https://www.irs.gov/businesses/small-businesses-self-employed/get-an-employer-identification-number",
        "blocks": [
          {
            "kind": "paragraph",
            "text": "Use this tool to get an EIN directly from the IRS in minutes for free. Answer questions and submit the application. If it’s approved, we’ll issue your EIN immediately online."
          },
          {
            "kind": "items",
            "items": [
              "Complete the application in one session. You can't save it for later.",
              "It expires after 15 minutes of inactivity, and you’ll need to start over.",
              "Print your EIN confirmation letter for your records."
            ]
          },
          {
            "kind": "paragraph",
            "text": "You can apply for only 1 EIN per responsible party per day."
          },
          {
            "kind": "items",
            "intro": "Use this if all of these are correct:",
            "items": [
              "You are a domestic organization, formed or created in the United States or U.S. territories.",
              "Your principal place of business is in the U.S. or U.S. territories.",
              "You're the responsible party in control of the entity or its authorized representative.",
              "You have the responsible party’s Social Security number (SSN) or individual taxpayer ID number (ITIN)."
            ]
          },
          {
            "kind": "paragraph",
            "text": "If you are creating a corporation or LLC, form your entity through the secretary of state before you apply for an EIN. If you don’t form your entity with the state first, your EIN application may be delayed."
          }
        ]
      }
    ]
  },
  {
    "id": "how-does-the-irs-classify-an-llc",
    "question": "How does the IRS classify an LLC for federal tax?",
    "quotations": [
      {
        "sourceUrl": "https://www.irs.gov/businesses/small-businesses-self-employed/limited-liability-company-llc",
        "blocks": [
          {
            "kind": "paragraph",
            "text": "Depending on elections made by the LLC and the number of members, the IRS will treat an LLC as either a corporation, partnership, or as part of the LLC’s owner’s tax return (a “disregarded entity”). Specifically, a domestic LLC with at least two members is classified as a partnership for federal income tax purposes unless it files Form 8832 and affirmatively elects to be treated as a corporation. For income tax purposes, an LLC with only one member is treated as an entity disregarded as separate from its owner, unless it files Form 8832 and elects to be treated as a corporation. However, for purposes of employment tax and certain excise taxes, an LLC with only one member is still considered a separate entity."
          }
        ]
      }
    ]
  },
  {
    "id": "how-is-a-single-member-llc-reported",
    "question": "How is a single-member LLC reported if it does not elect corporate status?",
    "quotations": [
      {
        "sourceUrl": "https://www.irs.gov/businesses/small-businesses-self-employed/single-member-limited-liability-companies",
        "blocks": [
          {
            "kind": "items",
            "intro": "If a single-member LLC does not elect to be treated as a corporation, the LLC is a \"disregarded entity,\" and the LLC's activities should be reflected on its owner's federal tax return. If the owner is an individual, the activities of the LLC will generally be reflected on:",
            "items": [
              "Form 1040 or 1040-SR Schedule C, Profit or Loss from Business (Sole Proprietorship)",
              "Form 1040 or 1040-SR Schedule E, Supplemental Income or Loss",
              "Form 1040 or 1040-SR Schedule F, Profit or Loss from Farming"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "when-does-a-disregarded-single-member-llc-need-an-ein",
    "question": "When does a disregarded single-member LLC need an EIN?",
    "quotations": [
      {
        "sourceUrl": "https://www.irs.gov/businesses/small-businesses-self-employed/single-member-limited-liability-companies",
        "blocks": [
          {
            "kind": "paragraph",
            "text": "A single-member LLC that is a disregarded entity that does not have employees and does not have an excise tax liability does not need an EIN. It should use the name and TIN of the single member owner for federal tax purposes. However, if a single-member LLC, whose taxable income and loss will be reported by the single member owner needs an EIN to open a bank account or if state tax law requires the single-member LLC to have a federal EIN, then the LLC can apply for and obtain an EIN."
          }
        ]
      }
    ]
  },
  {
    "id": "what-is-estimated-tax",
    "question": "What is estimated tax, and which form do individuals use to figure it?",
    "quotations": [
      {
        "sourceUrl": "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes",
        "blocks": [
          {
            "kind": "paragraph",
            "text": "Taxes must be paid as you earn or receive income during the year, either through withholding or estimated tax payments. If the amount of income tax withheld from your salary or pension is not enough, or if you receive income such as interest, dividends, alimony, self-employment income, capital gains, prizes and awards, you may have to make estimated tax payments. If you are in business for yourself, you generally need to make estimated tax payments. Estimated tax is used to pay not only income tax, but other taxes such as self-employment tax and alternative minimum tax."
          },
          {
            "kind": "paragraph",
            "text": "Individuals, including sole proprietors, partners, and S corporation shareholders, generally use Form 1040-ES, to figure estimated tax."
          }
        ]
      }
    ]
  },
  {
    "id": "who-must-pay-estimated-tax",
    "question": "Who must pay estimated tax?",
    "quotations": [
      {
        "sourceUrl": "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes",
        "blocks": [
          {
            "kind": "paragraph",
            "text": "Individuals, including sole proprietors, partners, and S corporation shareholders, generally have to make estimated tax payments if they expect to owe tax of $1,000 or more when their return is filed."
          },
          {
            "kind": "paragraph",
            "text": "Corporations generally have to make estimated tax payments if they expect to owe tax of $500 or more when their return is filed."
          }
        ]
      }
    ]
  },
  {
    "id": "when-are-quarterly-estimated-tax-payments-due",
    "question": "When are quarterly estimated tax payments due?",
    "quotations": [
      {
        "sourceUrl": "https://www.irs.gov/faqs/estimated-tax",
        "blocks": [
          {
            "kind": "paragraph",
            "text": "For estimated tax purposes, the year is divided into four payment periods. Each period has a specific payment due date. If you don't pay enough tax by the due date of each payment period, you may be charged a penalty even if you're due a refund when you file your income tax return at the end of the year."
          },
          {
            "kind": "table",
            "rows": [
              [
                "Payment period",
                "Due date"
              ],
              [
                "Jan. 1–March 31",
                "April 15"
              ],
              [
                "April 1–May 31",
                "June 15"
              ],
              [
                "June 1–Aug. 31",
                "Sept. 15"
              ],
              [
                "Sept. 1–Dec. 31",
                "Jan. 15 of the following year. For an exception to paying on Jan. 15, see January payment in Chapter 2 of Publication 505, Tax Withholding and Estimated Tax"
              ],
              [
                "Fiscal-year taxpayers",
                "If your tax year doesn't begin on Jan. 1, see the special rules for fiscal-year taxpayers in Chapter 2 of Publication 505"
              ],
              [
                "Taxpayers with income from farming or fishing",
                "See Farming and Fishing in Chapter 2 of Publication 505"
              ]
            ]
          },
          {
            "kind": "paragraph",
            "text": "Note: If the due date for making an estimated tax payment falls on a Saturday, Sunday, or legal holiday, the payment will be on time if you make it on the next day that's not a Saturday, Sunday, or legal holiday."
          }
        ]
      }
    ]
  }
];
