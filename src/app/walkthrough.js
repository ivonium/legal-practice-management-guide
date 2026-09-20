// Trust Transaction Walkthrough engine - Sheet A section 8.10. Pure state logic;
// the UI lives in calculators.js. Every rule reference, particular and warning in
// WT_LABELS is checked by a unit test against the Trust Accounting guide text.

export const WT_CATEGORIES = [
  { id: 'general', label: 'General trust money' },
  { id: 'controlled', label: 'Controlled money' },
  { id: 'transit', label: 'Transit money' },
  { id: 'direction', label: 'Written direction money' },
  { id: 'power', label: 'Power money' },
  { id: 'billed', label: 'Money for services already billed (not trust money)' },
];

export const WT_FORMS = ['cash', 'cheque', 'direct deposit', 'credit card'];

// Labels quoted from the Trust Accounting guide. `verbatim: false` entries are
// the closest guide wording where no exact sentence exists (logged in BUILD_NOTES).
export const WT_LABELS = {
  receiptTitle: 'Trust receipts (r 36)',
  receiptParticulars: [
    'Date the receipt is made out, and the date of receipt of the money if different',
    'Receipt number',
    'Amount received',
    'Form in which received (cash, cheque, direct deposit, credit card)',
    'Name of the person from whom received',
    'Name of the client in respect of whom received, plus matter description and matter reference',
    'Particulars sufficient to identify the reason for the receipt',
    'Name of the person who made out the receipt',
  ],
  receiptNote1: 'Made out as soon as practicable after receipt, including for direct deposits and for withdrawals of statutory deposit back into the GTA. The original is given on request to the payer.',
  receiptNote2: 'Form: duplicate; consecutively numbered and issued in sequence; practice name or business name; the expression "Trust Account" or "Trust A/c".',
  depositTitle: 'Deposit records (r 37)',
  depositNote1: 'In duplicate, produced to the ADI for each deposit other than direct deposits, filed in the order deposits were made.',
  depositParticulars: "Required particulars: date of deposit; amount of deposit; the cheques, notes and coins content and the amount of each; and for each cheque, the drawer's name, the name and branch or BSB of the ADI on which it is drawn, and the amount.",
  depositNote2: 'Butt-style deposit slips cannot be used because the drawer and bank details are surrendered to the ADI.',
  cashBookTitle: 'Cash books (rr 44, 45)',
  receiptsCashBook: 'Receipts cash book: all particulars on the trust receipt except the practice name, the "trust account" expression and the maker\'s name; recorded in the order the receipts are made out; plus the date and amount of each deposit.',
  paymentsCashBook: 'Payments cash book: the information on the cheque butt, requisition or EFT record; recorded in the order cheques or EFTs were made or cancelled.',
  cashBookTiming: 'Both within 5 working days of the receipt or payment.',
  ledgerTitle: 'Trust ledger accounts (r 47)',
  ledgerHeading: "Ledger heading must record and keep up to date: the name of the person for and on behalf of whom the money was paid; the person's address; particulars sufficient to identify the matter (r 47(2)).",
  ledgerParticulars: ['Date of the transaction', 'Reference number and transaction type', 'Particulars sufficient to identify the reason', 'Amount'],
  ledgerReceiptExtra: 'Receipt: the provider, and the date received if different from the date of receipt',
  ledgerChequeExtra: 'Cheque: the payee, or for a cheque to an ADI, the ADI name or BSB and the beneficiary',
  ledgerEftExtra: 'EFT: the account name and number, the BSB, and the beneficiary',
  ledgerJournalExtra: 'Journal: the ledger reference, the person on whose behalf the transfer was made, and the matter description',
  ledgerTiming: 'Transactions recorded in the order they occur, within 5 working days, with the balance shown after each transaction (r 47(4)).',
  controlTitle: 'Control account',
  controlPosting: 'Post individual entries to the trust ledgers daily; post cash book totals to the control account monthly.',
  postingReceipt: ['Receipt', 'Control account (monthly total)', 'Trust ledger account (daily)'],
  postingPayment: ['Payment', 'Trust ledger account (daily)', 'Control account (monthly total)'],
  postingReceiptReversal: ['Receipt reversal', 'Trust ledger account', 'Control account'],
  postingJournal: 'A journal entry has no effect on the control account.',
  monthEndTitle: 'Month end',
  monthEndRef: 'r 48',
  monthEndTwo: 'Two statements, both as at the end of each named month and both within 15 working days of month end (r 48).',
  trialBalanceLine: 'for each ledger account the account name, matter reference, short matter description and month end balance',
  reconOutstanding: 'Add outstanding deposits',
  statementTitle: 'Trust account statements',
  statementRef: 'rr 52',
  statementWhen: 'When (r 52(4)), as soon as practicable after: completion of the matter; a reasonable request by the person during the matter; 30 June each year.',
  statementContent: 'Content (r 52(3)): all information required to be kept in the relevant ledger account or record, plus the remaining balance. In substance it mirrors the ledger. Retain a copy.',
  timingReceipt: 'Made out as soon as practicable after receipt',
  timingDeposit: 'Deposit to the GTA at an authorised ADI in NSW as soon as practicable (s 137, s 136)',
  timing5: '5 working days to record a receipt, payment or transfer in the cash books and the trust ledger.',
  timing15: '15 working days after month end for the bank reconciliation, the trial balance and the controlled money listing.',
  // controlled money
  cmReceiptTitle: 'Controlled money receipts (r 62)',
  cmReceiptParticulars: [
    'Date the receipt is made out',
    'Date of receipt of the money, if different',
    'Receipt number',
    'Form in which received',
    'Name of the person from whom received',
    'Name of the person on whose behalf received, matter description and matter reference',
    'Name and details clearly identifying the CMA to be credited, unless the account is not yet established',
    'Particulars identifying the reason for the receipt',
    'Name of the person who made out the receipt',
    'Amount received',
  ],
  cmNaming: 'Account name must include (r 61): the practice name; the expression "controlled money account", "CMA" or "CMA/c"; and particulars sufficient to identify the purpose and distinguish it from other accounts.',
  cmMovementTitle: 'Controlled money register and movement records (r 64)',
  cmMovementReceipt: 'On receipt, record: the date received; receipt number; date deposited; name and details of the CMA; amount deposited; details sufficient to identify the deposit; interest received.',
  cmMovementWithdrawal: 'On withdrawal, record: the date and number of the payment; the destination account (EFT) or payee (cheque) or ADI and beneficiary; the person on whose behalf paid and the matter reference; the purpose; the authorised person effecting the withdrawal; and the amount.',
  cmRegister: 'A register holding, for all CMAs: written directions; cheque and payment records; the movement record for each account; the monthly listing; ADI statements and interest notifications; account statements; and supporting information.',
  cmListingTitle: 'Monthly controlled money listing (r 64(8)-(9))',
  cmListing: 'As at the end of each month, in permanent form, within 15 working days, showing: the month; the date of preparation; and for each account, the name, number and balance, the person on whose behalf held, and a short description of the matter.',
  cmListingReview: 'Must be reviewed by a principal who is authorised to receive trust money, and the review evidenced on the statement (r 64(9)).',
  cmDirection: 'A written direction is the gateway. Obtain it before depositing (s 139(1)).',
  cmRetain: 'Retain the direction for 7 years (s 139(5)), in the controlled money register with a copy on the matter file.',
  cmInterest: 'Controlled money exists so the client earns the interest. Interest on the GTA goes to the Public Purpose Fund.',
  cmPayments: 'Only by cheque or EFT. Prohibited: cash withdrawals; ATM withdrawals or transfers; telephone banking; BPAY.',
  // transit
  transitRecord: 'Record and keep brief particulars sufficient to identify the transaction and any purpose for which the money was received (s 140(2)), for 7 years (s 140(3)).',
  transitPractice: 'In practice: copies of third-party cheques, settlement directions, directions from an incoming mortgagee or to an agent, kept on the client file. No cash book, ledger, journal or trust account statement.',
  transitDeal: 'Pay or deliver within the period specified, else as soon as practicable (s 140(1))',
  transitPoint: 'Transit money is a third-party cheque passing across your desk (classically, a duty cheque payable to Revenue NSW). If the money is paid to you and goes into your trust account, it is not transit money. Keep a photocopy of the cheque plus any settlement directions on the file.',
  // written direction
  directionRecord: 'Keep the written direction as part of the trust records for 7 years after finalisation of the matter (s 142; s 147(2)(c)). Keep originals in a single folder with copies on the matter files, plus a copy of the cheque. No cash book, ledger, journal or trust account statement.',
  directionOffice: 'Written direction money cannot be directed into your office account or any account holding other money, because s 146 forbids intermixing.',
  directionDeal: 'Comply within the period specified, else as soon as practicable (s 142)',
  // power
  powerRecord: 'Keep a record of all dealings with the money to which the practice or associate is a party, and all supporting information, in a manner that enables the dealings to be clearly understood.',
  powerRetain: 'Retain the record, the supporting information and the power itself for 7 years (s 147(2)(c)), including bank statements, payee details, supporting invoices and receipts, and cheque books.',
  powerRegister: "Register of Powers and Estates (r 60). Must record: particulars sufficient to identify each power the practice or an associate is acting or entitled to act under, including the donor's name and address and the date of the power;",
  powerStatement: 'That means general trust money, controlled money, power money and investment of trust money.',
  powerCosts: 'Power money costs cannot be drawn under rule 42. Costs can be taken only under the power itself.',
  // billed
  billedRow: ['Money for services already provided, bill given', 'Not trust money (s 129(2)(a)). Draw it out promptly'],
  billedNotice: ['s 129(2)(a)', 'Services already provided, bill given', 'No'],
  billedIntermix: 'The two commonest breaches are leaving billed costs sitting in trust (once billed for services provided, it is your money and no longer trust money), and taking disbursement funds straight into the office account.',
  // overrides
  cashRule: 'Is it cash? It must go to the GTA (or CMA for controlled money) before anything else, whatever the direction says (s 143). Then continue.',
  cashRule2: 'All trust money received as cash goes into the GTA first (or the CMA, for controlled money), before being dealt with in any other way, regardless of anything to the contrary in the direction or instructions (s 143).',
  creditCard: 'a credit card payment may be accepted as trust money only if the whole amount is credited to the trust account with fees debited to office. You cannot take trust money by credit card to the office account and transfer it across.',
  creditCardBreach: 'No intermixing. Trust money must not be mixed with other money, in either direction, except as authorised by the DLRA',
  ttr: 'law practices providing designated services are reporting entities under the AML/CTF Act 2006 (Cth) and cash is reported by threshold transaction report.',
  // events
  billNoLongerTrust: 'Money for services provided and billed is no longer trust money (s 129(2)(a)). Leaving it in trust is intermixing under s 146 and costs you cash flow.',
  drawPromptly: 'Draw promptly once you can',
  paymentsTitle: 'Payments (s 144(1), r 43)',
  paymentMethods: 'Only two methods: cheque or electronic funds transfer. No cash withdrawals, no ATM withdrawals or transfers, no telephone withdrawals or transfers.',
  chequeParticulars: [
    'Date and number of the cheque',
    'Amount ordered to be paid',
    'Name of the payee, or if payable to an ADI, the name or BSB of the ADI and the name of the person receiving the benefit',
    'Name of the person on whose behalf the payment was made, and the matter reference',
    'Details clearly identifying the ledger account to be debited',
    'Particulars sufficient to identify the reason for the payment',
  ],
  eftParticulars: [
    'Date of transfer',
    'Reference number or other means of identifying the transfer',
    'Amount',
    'Name and number of the account transferred to, and the BSB',
    "Name of the person on whose behalf the payment was made and the matter reference (or, for an ADI payment, the ADI name or BSB and the beneficiary's name)",
    'Details clearly identifying the ledger account to be debited',
    'Particulars sufficient to identify the reason for the payment',
  ],
  writtenRecord: 'Written record of each payment must be kept unless the particulars are recorded by a computerised system in the payments cash book at the time the cheque is issued or the transfer is effected; and even then, a written record sufficient to verify the system\'s accuracy must be kept (r 43(3)).',
  adiPayee: 'Payments to an ADI. Record both: for a trust cheque payable to your bank to obtain a bank cheque for Revenue NSW, the payee is "[Bank] B/C Revenue NSW".',
  method3Rule: "Money is taken to have been paid on the person's behalf when the practice's account has been debited (r 42(8)).",
  method3Pay: 'You cannot transfer from trust and then pay. Pay first, wait for the debit, then reimburse. This catches practices that pay disbursements by credit card.',
  journalTitle: 'Trust transfer journal (r 46)',
  journalParticulars: 'Particulars (r 46(3)): date of transfer; the ledger transferred from (ledger reference, person\'s name, matter description); the ledger transferred to (same); particulars identifying the reason; and the amount to and from each ledger. Journal pages or entries must be consecutively numbered (r 46(4)).',
  journalAuth: 'Must be authorised in writing by an authorised principal or, if unavailable, an authorised legal practitioner associate, an authorised Australian legal practitioner holding a certificate authorising the receipt of trust money, two authorised associates jointly, or an external intervener. Retain particulars of each authorisation (r 46(2)).',
  journalPermitted: 'Permitted only if the practice is entitled to withdraw the money and pay it to the other ledger (r 46(1)).',
  refundStatement: 'Nothing beyond the ordinary book entries and the trust account statement at the close of the matter (r 52(4)(a)), on which the final entry records the repayment.',
  dishonour: 'Dishonoured cheques. Not a cancellation and no negative receipt. Retain the dishonour notice, rewrite the entry in the receipts cash book as a negative amount with the reason, and post to the debit side of the ledger. If the receipt has already been drawn against, deposit office funds into the GTA immediately to remedy the deficiency, issue a receipt, and notify under s 154.',
  interestError: 'Interest on the GTA is payable to the Law Society for the Public Purpose Fund. It should not be credited to the trust or office account. If the ADI credits it in error, show it as an adjusting item and have the ADI reverse it.',
  adiErrors: 'ADI errors (cheque book costs, interest, incorrect deposits) are not recorded in the cash book or posted to a ledger. Show them as an adjusting item on the reconciliation and ask the ADI to reverse them directly.',
  overdrawGuide: 'Never overdraw a client\'s ledger. A debit balance is a breach even by $1, and an irregularity.',
  overdrawSpec: "This would overdraw the client's trust ledger. A debit balance is a breach even by $1 (s 148) and an irregularity requiring notification (s 154).",
  noDeficiency: 'No deficiency. Must not, without reasonable excuse, cause a deficiency in any trust account or trust ledger, or a failure to pay or deliver trust money.',
  rule42Wait1: '7 business days with no objection; or 30 days after the later of the bill date and receipt of an itemised bill where the person objects but has not referred the matter to the Commissioner or for assessment; or the money otherwise becomes legally payable',
  rule42Wait234: 'None',
  costsClearing: 'as a costs clearing account aggregating money properly due to the practice for legal costs, which must be withdrawn from the GTA within one month of the transfer in (r 49(3))',
};

export function wtInitialState() {
  return {
    receipt: { amount: '', dateReceived: '', dateMadeOut: '', form: 'direct deposit', from: '', client: '', matterRef: '', matterDesc: '', reason: '', madeOutBy: '' },
    category: 'general',
    cmaName: '',
    events: [],
    receiptSeq: 1,
    journalSeq: 1,
    eftSeq: 1,
    chequeSeq: 1,
  };
}

// Effective category after the cash rule (s 143). Returns {deposit: 'GTA'|'CMA'|null, onward: bool}
export function cashOverride(form, category) {
  if (form !== 'cash') return { applies: false, deposit: category === 'controlled' ? 'CMA' : category === 'general' ? 'GTA' : null, onward: false };
  if (['transit', 'direction', 'power'].includes(category)) return { applies: true, deposit: 'GTA', onward: true };
  if (category === 'controlled') return { applies: true, deposit: 'CMA', onward: false };
  return { applies: false, deposit: category === 'general' ? 'GTA' : null, onward: false };
}

export function cmaNameCompliant(name, practiceName) {
  const n = String(name || '');
  const hasExpr = /controlled money account|\bCMA\b|CMA\/c/i.test(n);
  const hasPractice = practiceName ? n.toLowerCase().includes(String(practiceName).toLowerCase()) : n.trim().length > 0;
  return { compliant: hasExpr && hasPractice, hasExpr, hasPractice };
}

// Computes the running ledger from the receipt and events. Returns
// { entries:[{date,ref,type,particulars,debit,credit,balance}], cashbook:{receipts:[],payments:[]}, journal:[] }
export function wtLedger(state) {
  const amount = toNumber(state.receipt.amount);
  const entries = [];
  const receipts = [];
  const payments = [];
  const journal = [];
  let balance = 0;
  const ov = cashOverride(state.receipt.form, state.category);
  const ledgerCat = state.category === 'general' || (ov.applies && ov.deposit === 'GTA') ? 'general' : state.category;
  if (ledgerCat === 'general' && amount > 0) {
    balance += amount;
    const ref = `R${state.receiptSeq}`;
    entries.push({ date: state.receipt.dateMadeOut || state.receipt.dateReceived, ref, type: 'Receipt', particulars: `${state.receipt.from || '[from]'} - ${state.receipt.reason || '[reason]'}`, debit: 0, credit: amount, balance });
    receipts.push({ date: state.receipt.dateMadeOut || state.receipt.dateReceived, ref, from: state.receipt.from, client: state.receipt.client, matterRef: state.receipt.matterRef, reason: state.receipt.reason, form: state.receipt.form, amount, deposited: state.receipt.form === 'direct deposit' ? amount : amount, negative: false });
  }
  let chequeSeq = state.chequeSeq;
  let eftSeq = state.eftSeq;
  let journalSeq = state.journalSeq;
  for (const ev of state.events) {
    const amt = toNumber(ev.amount);
    if (ev.type === 'bill' || ev.type === 'disbursement' || ev.type === 'reimbursement' || ev.type === 'refund') {
      balance -= amt;
      const ref = ev.method === 'cheque' ? `C${chequeSeq++}` : `E${eftSeq++}`;
      const typeLabel = ev.type === 'bill' ? 'Payment' : ev.type === 'refund' ? 'Payment' : 'Payment';
      entries.push({ date: ev.date, ref, type: typeLabel, particulars: ev.particulars || ev.payee || '', debit: amt, credit: 0, balance, event: ev });
      payments.push({ date: ev.date, ref, payee: ev.payee, amount: amt, reason: ev.particulars || '', method: ev.method, event: ev });
    } else if (ev.type === 'transfer') {
      balance -= amt;
      const jn = `J${journalSeq++}`;
      entries.push({ date: ev.date, ref: jn, type: 'Journal', particulars: `To ${ev.toClient || '[client]'} ${ev.toMatter || ''} - ${ev.reason || ''}`, debit: amt, credit: 0, balance, event: ev });
      journal.push({ n: jn, date: ev.date, from: { client: state.receipt.client, matterRef: state.receipt.matterRef, matterDesc: state.receipt.matterDesc }, to: { client: ev.toClient, matterRef: ev.toMatter, matterDesc: ev.toMatterDesc || '' }, reason: ev.reason, amount: amt, authorisedBy: ev.authorisedBy });
    } else if (ev.type === 'reversal') {
      balance -= amount;
      entries.push({ date: ev.date, ref: `R${state.receiptSeq}`, type: 'Receipt reversal', particulars: 'Dishonoured cheque', debit: amount, credit: 0, balance, event: ev });
      receipts.push({ date: ev.date, ref: `R${state.receiptSeq}`, from: state.receipt.from, client: state.receipt.client, matterRef: state.receipt.matterRef, reason: 'Dishonoured cheque', form: state.receipt.form, amount: -amount, deposited: -amount, negative: true });
    }
    // 'interest' events produce no ledger or cash book entries
  }
  return { entries, receipts, payments, journal, balance, ledgerCat };
}

// Validate a candidate event against the guard rails. Returns {ok, error, warnings}
export function wtValidateEvent(state, ev) {
  const cur = wtLedger(state);
  const amt = toNumber(ev.amount);
  const warnings = [];
  if (ev.type === 'reimbursement') {
    if (!ev.officeDebitDate || (ev.date && ev.officeDebitDate > ev.date)) {
      return { ok: false, error: WT_LABELS.method3Rule + ' ' + WT_LABELS.method3Pay, blockedBy: 'method3' };
    }
  }
  if (ev.type === 'interest') return { ok: true, warnings };
  if (ev.type === 'reversal') {
    const drawn = cur.entries.some((e) => e.debit > 0);
    if (drawn) warnings.push('deficiency');
    return { ok: true, warnings };
  }
  if (!(amt > 0)) return { ok: false, error: 'Enter an amount greater than zero.' };
  if (cur.balance - amt < 0) return { ok: false, error: WT_LABELS.overdrawSpec, blockedBy: 'overdraw' };
  return { ok: true, warnings };
}

export function wtAddEvent(state, ev) {
  const v = wtValidateEvent(state, ev);
  if (!v.ok) return v;
  state.events.push({ ...ev, id: uuid(), warnings: v.warnings });
  return v;
}

// Rule 42 waiting period text for a bill event
export function wtWaitingPeriod(method, billDate) {
  if (method === 1) return { text: WT_LABELS.rule42Wait1, earliest: method1EarliestWithdrawal(billDate) };
  return { text: WT_LABELS.rule42Wait234, earliest: billDate || null };
}
