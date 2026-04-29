export const LANGUAGES = {
  EN: "en",
  HI: "hi",
  HING: "hing"
};

export const translations = {

  en: {
    sidebar: {
      dashboard:    "Dashboard",
      addSale:      "Add Sale",
      stock:        "Stock",
      reports:      "Reports",
      creditScore:  "Credit Score",
      creditLedger: "Credit Ledger",
      creditLoan:   "Credit Loan",
      manageStaff:  "Manage Staff",
      shopSettings: "Shop Settings",
      auditLog:     "Audit Log",
      coupons:      "Coupons",
      logout:       "Logout"
    },

    dashboard: {
      title:          "Dashboard",
      viewSummary:    "View Today's Summary",
      totalSales:     "Total Sales",
      transactions:   "Transactions",
      creditSales:    "Credit Sales",
      todayProfit:    "Today's Profit",
      creditHealth:   "Business Credit Health",
      insights:       "Insights"
    },

    addSale: {
      title:             "Add Transaction",
      quickSale:         "Quick Sale",
      itemSale:          "Item Sale",
      amount:            "Amount",
      enterAmount:       "Enter amount",
      paymentMethod:     "Payment Method",
      customerName:      "Customer Name",
      enterCustomer:     "Enter customer name",
      enterMobileNumber: "Enter Mobile Number",
      save:              "Save",
      cash:              "Cash",
      upi:               "UPI",
      credit:            "Credit",
      noItems:           "No items added",
      notEnoughStock:    "Not enough stock",
      selectPayment:     "Select payment method",
      invalidAmount:     "Invalid amount",
      transactionSaved:  "Transaction saved",
      customerRequired:  "Customer name required"
    },

    stock: {
      title:        "Manage Stock",
      addNewItem:   "Add New Item",
      itemName:     "Item name (e.g. Rice 1kg)",
      costPrice:    "Cost Price (₹)",
      sellPrice:    "Selling Price (₹)",
      quantity:     "Quantity",
      alertLevel:   "Alert level",
      addItem:      "Add Item",
      currentStock: "Current Stock",
      addQty:       "+ Add",
      editAlert:    "Edit Alert",
      remove:       "Remove",
      autoUpload:   "Auto-Upload Bill"
    },

    reports: {
      title:        "Reports",
      today:        "Today",
      last7:        "Last 7 Days",
      thisMonth:    "This Month",
      stockAlerts:  "Stock Alerts",
      profitTrend:  "Profit Trend (Last 7 Days)",
      allSufficient:"All stocks are sufficient 👍"
    },

    creditScore: {
      title:    "Customer Intelligence",
      subtitle: "Know who is safe to give credit"
    },

    creditLoan: {
      title:             "Credit Loan",
      subtitle:          "Record money given (Udhar) or repayments separately from sales",
      giveLoan:          "Give Loan",
      repayment:         "Record Repayment",
      customerName:      "Customer Name",
      enterName:         "Enter customer name",
      phone:             "Phone Number",
      enterPhone:        "Enter phone number",
      amountGiven:       "Amount Given (₹)",
      amountRepaid:      "Amount Repaid (₹)",
      notes:             "Notes",
      optional:          "Optional",
      date:              "Date",
      recordGive:        "Record Loan Given",
      recordRepay:       "Record Repayment",
      outstandingTitle:  "Outstanding Loans",
      outstanding:       "Outstanding loan",
      loadingHistory:    "Loading...",
      noOutstanding:     "No outstanding loans",
      nameRequired:      "Customer name is required",
      amountRequired:    "Enter a valid amount",
      saving:            "Saving...",
      loanRecorded:      "Loan recorded",
      repaymentRecorded: "Repayment recorded"
    },

    shopSettings: {
      title:        "Shop Settings",
      shopName:     "Shop Name",
      upiId:        "UPI ID",
      email:        "Contact Email",
      save:         "Save Settings",
      cloudSync:    "Cloud Sync",
      cloudDesc:    "Connect to sync data to MySQL automatically.",
      connected:    "Connected — Sync Active",
      notConnected: "Not Connected",
      login:        "Login",
      register:     "Register Shop",
      ownerPhone:   "Owner Phone",
      password:     "Password",
      connect:      "Connect to Cloud",
      disconnect:   "Disconnect"
    },

    credit: {
      safe:        "Safe to give credit",
      warn:        "Allow but remind payment soon",
      danger:      "High risk customer — repayment doubtful",
      limitCross:  "Crossing safe limit",
      outstanding: "Outstanding",
      limit:       "Limit",
      paysFast:    "Usually pays quickly",
      reliable:    "Generally reliable",
      slow:        "Often delays payment"
    },

    daily: {
      title:           "Daily Summary",
      totalSales:      "Total Sales",
      transactions:    "Transactions",
      creditGiven:     "Credit Given",
      estimatedProfit: "Estimated Profit",
      ok:              "OK"
    },

    creditAdvisor: {
      allow:       "Safe to give credit",
      warn:        "Allow but remind payment soon",
      danger:      "High risk customer — repayment doubtful",
      crossing:    "Crossing safe limit",
      outstanding: "Outstanding",
      limit:       "Limit",
      fast:        "Usually pays quickly",
      normal:      "Generally reliable",
      slow:        "Often delays payment",
      never:       "Very late payer",
      regular:     "Regular customer"
    }
  },

  /* ─────────────────────── HINDI ─────────────────────── */
  hi: {
    sidebar: {
      dashboard:    "डैशबोर्ड",
      addSale:      "बिक्री जोड़ें",
      stock:        "स्टॉक",
      reports:      "रिपोर्ट",
      creditScore:  "क्रेडिट स्कोर",
      creditLedger: "उधार खाता",
      creditLoan:   "उधार ऋण",
      manageStaff:  "स्टाफ प्रबंधन",
      shopSettings: "दुकान सेटिंग्स",
      auditLog:     "ऑडिट लॉग",
      coupons:      "कूपन",
      logout:       "लॉगआउट"
    },

    dashboard: {
      title:        "डैशबोर्ड",
      viewSummary:  "आज का सारांश देखें",
      totalSales:   "कुल बिक्री",
      transactions: "लेनदेन",
      creditSales:  "उधार बिक्री",
      todayProfit:  "आज का लाभ",
      creditHealth: "व्यावसायिक क्रेडिट स्वास्थ्य",
      insights:     "अंतर्दृष्टि"
    },

    addSale: {
      title:             "लेनदेन जोड़ें",
      quickSale:         "त्वरित बिक्री",
      itemSale:          "सामान बिक्री",
      amount:            "राशि",
      enterAmount:       "राशि दर्ज करें",
      paymentMethod:     "भुगतान तरीका",
      customerName:      "ग्राहक का नाम",
      enterCustomer:     "ग्राहक का नाम दर्ज करें",
      enterMobileNumber: "मोबाइल नंबर दर्ज करें",
      save:              "सहेजें",
      cash:              "नकद",
      upi:               "यूपीआई",
      credit:            "उधार",
      noItems:           "कोई सामान नहीं",
      notEnoughStock:    "स्टॉक पर्याप्त नहीं",
      selectPayment:     "भुगतान तरीका चुनें",
      invalidAmount:     "गलत राशि",
      transactionSaved:  "लेनदेन सहेजा गया",
      customerRequired:  "ग्राहक का नाम आवश्यक है"
    },

    stock: {
      title:        "स्टॉक प्रबंधन",
      addNewItem:   "नया सामान जोड़ें",
      itemName:     "सामान का नाम",
      costPrice:    "लागत मूल्य (₹)",
      sellPrice:    "बिक्री मूल्य (₹)",
      quantity:     "मात्रा",
      alertLevel:   "अलर्ट स्तर",
      addItem:      "जोड़ें",
      currentStock: "वर्तमान स्टॉक",
      addQty:       "+ जोड़ें",
      editAlert:    "अलर्ट संपादित करें",
      remove:       "हटाएं",
      autoUpload:   "बिल अपलोड करें"
    },

    reports: {
      title:        "रिपोर्ट",
      today:        "आज",
      last7:        "पिछले 7 दिन",
      thisMonth:    "इस महीने",
      stockAlerts:  "स्टॉक अलर्ट",
      profitTrend:  "लाभ प्रवृत्ति (पिछले 7 दिन)",
      allSufficient:"सभी स्टॉक पर्याप्त हैं 👍"
    },

    creditScore: {
      title:    "ग्राहक बुद्धिमत्ता",
      subtitle: "जानें किसे उधार देना सुरक्षित है"
    },

    creditLoan: {
      title:             "उधार ऋण",
      subtitle:          "बिक्री से अलग उधार या वापसी दर्ज करें",
      giveLoan:          "उधार दें",
      repayment:         "वापसी दर्ज करें",
      customerName:      "ग्राहक का नाम",
      enterName:         "नाम दर्ज करें",
      phone:             "फोन नंबर",
      enterPhone:        "फोन नंबर दर्ज करें",
      amountGiven:       "दी गई राशि (₹)",
      amountRepaid:      "वापस की गई राशि (₹)",
      notes:             "नोट्स",
      optional:          "वैकल्पिक",
      date:              "तारीख",
      recordGive:        "उधार दर्ज करें",
      recordRepay:       "वापसी दर्ज करें",
      outstandingTitle:  "बकाया उधार",
      outstanding:       "बकाया राशि",
      loadingHistory:    "लोड हो रहा है...",
      noOutstanding:     "कोई बकाया उधार नहीं",
      nameRequired:      "ग्राहक का नाम आवश्यक है",
      amountRequired:    "सही राशि दर्ज करें",
      saving:            "सहेज रहे हैं...",
      loanRecorded:      "उधार दर्ज हुआ",
      repaymentRecorded: "वापसी दर्ज हुई"
    },

    shopSettings: {
      title:        "दुकान सेटिंग्स",
      shopName:     "दुकान का नाम",
      upiId:        "UPI आईडी",
      email:        "संपर्क ईमेल",
      save:         "सेटिंग्स सहेजें",
      cloudSync:    "क्लाउड सिंक",
      cloudDesc:    "MySQL में डेटा सिंक करने के लिए कनेक्ट करें।",
      connected:    "कनेक्टेड — सिंक सक्रिय",
      notConnected: "कनेक्टेड नहीं",
      login:        "लॉगिन",
      register:     "दुकान पंजीकृत करें",
      ownerPhone:   "मालिक का फोन",
      password:     "पासवर्ड",
      connect:      "क्लाउड से कनेक्ट करें",
      disconnect:   "डिस्कनेक्ट"
    },

    credit: {
      safe:        "उधार देना सुरक्षित है",
      warn:        "उधार दे सकते हैं पर याद दिलाएं",
      danger:      "उच्च जोखिम — पैसा अटक सकता है",
      limitCross:  "सुरक्षित सीमा पार हो रही है",
      outstanding: "बाकी रकम",
      limit:       "सीमा",
      paysFast:    "जल्दी पैसा देता है",
      reliable:    "आमतौर पर सही ग्राहक",
      slow:        "अक्सर देर से भुगतान करता है"
    },

    daily: {
      title:           "आज का सारांश",
      totalSales:      "कुल बिक्री",
      transactions:    "लेनदेन",
      creditGiven:     "उधार दिया गया",
      estimatedProfit: "अनुमानित लाभ",
      ok:              "ठीक है"
    },

    creditAdvisor: {
      allow:       "उधार देना सुरक्षित है",
      warn:        "उधार दे सकते हैं पर याद दिलाएं",
      danger:      "उच्च जोखिम — पैसा अटक सकता है",
      crossing:    "सुरक्षित सीमा पार हो रही है",
      outstanding: "बाकी रकम",
      limit:       "सीमा",
      fast:        "जल्दी पैसा देता है",
      normal:      "आमतौर पर सही ग्राहक",
      slow:        "अक्सर देर से भुगतान करता है",
      never:       "बहुत देर से भुगतान",
      regular:     "नियमित ग्राहक"
    }
  },

  /* ─────────────────────── HINGLISH ─────────────────────── */
  hing: {
    sidebar: {
      dashboard:    "Dashboard",
      addSale:      "Sale Add karo",
      stock:        "Stock",
      reports:      "Reports",
      creditScore:  "Credit Score",
      creditLedger: "Udhar Khata",
      creditLoan:   "Udhar Loan",
      manageStaff:  "Staff Manage",
      shopSettings: "Shop Settings",
      auditLog:     "Audit Log",
      coupons:      "Coupons",
      logout:       "Logout"
    },

    dashboard: {
      title:        "Dashboard",
      viewSummary:  "Aaj ka Summary dekho",
      totalSales:   "Total Bikri",
      transactions: "Len-den",
      creditSales:  "Udhar Bikri",
      todayProfit:  "Aaj ka Profit",
      creditHealth: "Business Credit Health",
      insights:     "Insight"
    },

    addSale: {
      title:             "Transaction Add karo",
      quickSale:         "Quick Sale",
      itemSale:          "Item Sale",
      amount:            "Rakam",
      enterAmount:       "Rakam daalo",
      paymentMethod:     "Payment ka tarika",
      customerName:      "Customer naam",
      enterCustomer:     "Naam daalo",
      enterMobileNumber: "Mobile number daalo",
      save:              "Save karo",
      cash:              "Cash",
      upi:               "UPI",
      credit:            "Udhar",
      noItems:           "Koi item nahi",
      notEnoughStock:    "Stock kam hai",
      selectPayment:     "Payment select karo",
      invalidAmount:     "Galat amount",
      transactionSaved:  "Transaction save ho gaya",
      customerRequired:  "Customer naam chahiye"
    },

    stock: {
      title:        "Stock Manage karo",
      addNewItem:   "Naya Item Add karo",
      itemName:     "Item ka naam",
      costPrice:    "Cost Price (₹)",
      sellPrice:    "Sell Price (₹)",
      quantity:     "Quantity",
      alertLevel:   "Alert level",
      addItem:      "Add karo",
      currentStock: "Current Stock",
      addQty:       "+ Add",
      editAlert:    "Alert Edit karo",
      remove:       "Hatao",
      autoUpload:   "Bill Upload karo"
    },

    reports: {
      title:        "Reports",
      today:        "Aaj",
      last7:        "Pichle 7 din",
      thisMonth:    "Is mahine",
      stockAlerts:  "Stock Alerts",
      profitTrend:  "Profit Trend (Pichle 7 din)",
      allSufficient:"Sab stock theek hai 👍"
    },

    creditScore: {
      title:    "Customer Intelligence",
      subtitle: "Kisko udhar dena safe hai"
    },

    creditLoan: {
      title:             "Udhar Loan",
      subtitle:          "Sale se alag udhar ya wapsi record karo",
      giveLoan:          "Udhar Do",
      repayment:         "Wapsi Record karo",
      customerName:      "Customer naam",
      enterName:         "Naam daalo",
      phone:             "Phone number",
      enterPhone:        "Phone number daalo",
      amountGiven:       "Di gayi rakam (₹)",
      amountRepaid:      "Wapas ki gayi rakam (₹)",
      notes:             "Notes",
      optional:          "Optional",
      date:              "Tarikh",
      recordGive:        "Udhar Record karo",
      recordRepay:       "Wapsi Record karo",
      outstandingTitle:  "Baaki Udhar",
      outstanding:       "Baaki paisa",
      loadingHistory:    "Load ho raha hai...",
      noOutstanding:     "Koi baaki udhar nahi",
      nameRequired:      "Customer naam chahiye",
      amountRequired:    "Sahi amount daalo",
      saving:            "Save ho raha hai...",
      loanRecorded:      "Udhar record ho gaya",
      repaymentRecorded: "Wapsi record ho gayi"
    },

    shopSettings: {
      title:        "Shop Settings",
      shopName:     "Shop ka naam",
      upiId:        "UPI ID",
      email:        "Contact Email",
      save:         "Settings Save karo",
      cloudSync:    "Cloud Sync",
      cloudDesc:    "MySQL mein data sync karne ke liye connect karo.",
      connected:    "Connected — Sync chal raha hai",
      notConnected: "Connected nahi",
      login:        "Login",
      register:     "Shop Register karo",
      ownerPhone:   "Owner ka phone",
      password:     "Password",
      connect:      "Cloud se karo connect",
      disconnect:   "Disconnect karo"
    },

    credit: {
      safe:        "Udhar dena safe hai",
      warn:        "De sakte ho par jaldi yaad dilana",
      danger:      "Risky customer — paisa atak sakta hai",
      limitCross:  "Safe limit cross ho rahi hai",
      outstanding: "Baaki paisa",
      limit:       "Limit",
      paysFast:    "Jaldi paise deta hai",
      reliable:    "Theek customer hai",
      slow:        "Late payment karta hai"
    },

    daily: {
      title:           "Aaj ka Summary",
      totalSales:      "Total Bikri",
      transactions:    "Len-den",
      creditGiven:     "Udhar Diya",
      estimatedProfit: "Anumanit Profit",
      ok:              "Theek"
    },

    creditAdvisor: {
      allow:       "Udhar dena safe hai",
      warn:        "De sakte ho par yaad dilana",
      danger:      "Risky customer — paisa atak sakta hai",
      crossing:    "Safe limit cross ho rahi hai",
      outstanding: "Baaki paisa",
      limit:       "Limit",
      fast:        "Jaldi paises deta hai",
      normal:      "Theek customer hai",
      slow:        "Late payment karta hai",
      never:       "Bahut late deta hai",
      regular:     "Regular customer"
    }
  }
};
