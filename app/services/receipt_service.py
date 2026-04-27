from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Image as RLImage
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from sqlalchemy.orm import Session
from app.models import Gym, MembershipPlan
import httpx
import logging

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# NUMBER TO WORDS (Indian format)
# ─────────────────────────────────────────────

def _number_to_words(n):
    """Convert number to Indian English words (e.g. 1348 -> 'One Thousand Three Hundred and Forty-Eight')"""
    if n == 0:
        return "Zero"

    ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
            'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
            'Seventeen', 'Eighteen', 'Nineteen']
    tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

    def two_digits(num):
        if num < 20:
            return ones[num]
        t, o = divmod(num, 10)
        return tens[t] + ('-' + ones[o] if o else '')

    def three_digits(num):
        h, rest = divmod(num, 100)
        parts = []
        if h:
            parts.append(ones[h] + ' Hundred')
        if rest:
            if h:
                parts.append('and')
            parts.append(two_digits(rest))
        return ' '.join(parts)

    n = int(n)
    if n < 0:
        return 'Negative ' + _number_to_words(-n)

    # Indian system: Crore, Lakh, Thousand, Hundred
    parts = []
    if n >= 10000000:
        cr, n = divmod(n, 10000000)
        parts.append(three_digits(cr) + ' Crore')
    if n >= 100000:
        lk, n = divmod(n, 100000)
        parts.append(two_digits(lk) + ' Lakh')
    if n >= 1000:
        th, n = divmod(n, 1000)
        parts.append(two_digits(th) + ' Thousand')
    if n > 0:
        if parts:
            parts.append(three_digits(n))
        else:
            parts.append(three_digits(n))

    return ' '.join(parts)


def _amount_in_words(amount):
    """Convert amount to words like 'Rupees One Thousand Three Hundred and Forty-Eight Only'"""
    rupees = int(amount)
    paise = round((amount - rupees) * 100)
    words = f"Rupees {_number_to_words(rupees)}"
    if paise > 0:
        words += f" and {_number_to_words(paise)} Paise"
    words += " Only"
    return words.upper()


# ─────────────────────────────────────────────
# FETCH LOGO
# ─────────────────────────────────────────────

def _fetch_logo_image(logo_url: str, max_width=45*mm, max_height=25*mm):
    """Download gym logo and return ReportLab Image flowable."""
    if not logo_url:
        return None
    try:
        resp = httpx.get(logo_url, timeout=5, follow_redirects=True)
        if resp.status_code != 200:
            return None
        content_type = resp.headers.get("content-type", "")
        if not any(t in content_type for t in ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]):
            return None
        img_buffer = BytesIO(resp.content)
        img = RLImage(img_buffer)
        iw, ih = img.drawWidth, img.drawHeight
        if iw > 0 and ih > 0:
            ratio = min(max_width / iw, max_height / ih)
            img.drawWidth = iw * ratio
            img.drawHeight = ih * ratio
        return img
    except Exception as e:
        logger.warning(f"Failed to fetch gym logo: {e}")
        return None


# ─────────────────────────────────────────────
# GYM ADMIN — MEMBER PAYMENT RECEIPT
# ─────────────────────────────────────────────

def generate_receipt_pdf(payment, member, gym_id: str, db: Session) -> bytes:
    gym = db.query(Gym).filter(Gym.id == gym_id).first()
    gym_name = gym.name if gym else "FitNexus"
    gym_address = gym.address if gym else ""
    gym_phone = gym.phone if gym else ""
    gym_email = gym.email if gym else ""
    gym_logo_url = gym.logo_url if gym else None

    plan_name = ""
    if payment.membership_plan_id:
        plan = db.query(MembershipPlan).filter(MembershipPlan.id == payment.membership_plan_id).first()
        if plan:
            plan_name = f"{plan.name} ({plan.duration_days} days)"

    buffer = BytesIO()
    page_w, page_h = A4
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=20*mm, leftMargin=20*mm,
        topMargin=15*mm, bottomMargin=15*mm,
    )

    styles = getSampleStyleSheet()
    black = colors.HexColor("#111827")
    gray = colors.HexColor("#6B7280")
    border_c = colors.HexColor("#333333")
    light_border = colors.HexColor("#CCCCCC")
    primary = colors.HexColor("#DC2626")  # Red accent like the reference

    # Styles
    title_style = ParagraphStyle("title", parent=styles["Title"],
        textColor=black, fontSize=20, fontName="Helvetica-Bold",
        alignment=TA_CENTER, spaceAfter=2)
    tagline_style = ParagraphStyle("tagline", parent=styles["Normal"],
        textColor=primary, fontSize=8, fontName="Helvetica-Oblique",
        alignment=TA_CENTER, spaceAfter=6)
    normal = ParagraphStyle("norm", parent=styles["Normal"],
        textColor=black, fontSize=10, fontName="Helvetica")
    bold = ParagraphStyle("bld", parent=styles["Normal"],
        textColor=black, fontSize=10, fontName="Helvetica-Bold")
    small = ParagraphStyle("sm", parent=styles["Normal"],
        textColor=gray, fontSize=8)
    small_center = ParagraphStyle("smc", parent=styles["Normal"],
        textColor=gray, fontSize=8, alignment=TA_CENTER)
    right_text = ParagraphStyle("rt", parent=styles["Normal"],
        textColor=black, fontSize=10, fontName="Helvetica-Bold", alignment=TA_RIGHT)
    amount_words = ParagraphStyle("aw", parent=styles["Normal"],
        textColor=black, fontSize=9, fontName="Helvetica-Bold")

    elements = []
    content_width = doc.width

    # ── LOGO + GYM NAME ───────────────────────────
    logo_img = _fetch_logo_image(gym_logo_url, max_width=50*mm, max_height=30*mm)
    if logo_img:
        logo_table = Table([[logo_img]], colWidths=[content_width])
        logo_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        elements.append(logo_table)
    else:
        elements.append(Paragraph(gym_name, title_style))

    if gym_address:
        elements.append(Paragraph(gym_address, ParagraphStyle("addr", parent=styles["Normal"],
            textColor=gray, fontSize=9, alignment=TA_CENTER)))

    contact_parts = []
    if gym_phone:
        contact_parts.append(f"Ph: {gym_phone}")
    if gym_email:
        contact_parts.append(f"Email: {gym_email}")
    if contact_parts:
        elements.append(Paragraph(" | ".join(contact_parts), small_center))

    elements.append(Spacer(1, 4*mm))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=border_c))
    elements.append(Spacer(1, 4*mm))

    # ── RECEIPT INFO ROW ──────────────────────────
    col_half = content_width / 2
    info_data = [
        [Paragraph(f"<b>Receipt No.</b>  {payment.receipt_number}", normal),
         Paragraph(f"<b>Date:</b>  {payment.payment_date}", right_text)],
        [Paragraph(f"<b>Mrs./Miss./Mrs.</b>  {member.name if member else '—'}", normal),
         Paragraph(f"<b>Phone:</b>  {member.phone if member else '—'}", right_text)],
    ]
    if member and member.address:
        info_data.append([
            Paragraph(f"<b>Address:</b>  {member.address}", normal),
            Paragraph("", normal)
        ])

    info_table = Table(info_data, colWidths=[col_half, col_half])
    info_table.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 5*mm))

    # ── TRANSACTION TABLE ─────────────────────────
    col_sr = 12*mm
    col_type = 40*mm
    col_date = content_width - col_sr - col_type - 35*mm
    col_amount = 35*mm

    # Header row
    table_data = [
        [Paragraph("<b>Sr.No.</b>", normal),
         Paragraph("<b>Plan / Type</b>", normal),
         Paragraph("<b>Date of Transaction</b>", normal),
         Paragraph("<b>Amount</b>", right_text)],
    ]

    # Data row
    date_text = ""
    if payment.valid_from and payment.valid_to:
        date_text = f"From  {payment.valid_from}  to  {payment.valid_to}"
    else:
        date_text = str(payment.payment_date)

    table_data.append([
        Paragraph("1", normal),
        Paragraph(plan_name or payment.mode.value.upper(), normal),
        Paragraph(date_text, normal),
        Paragraph(f"{float(payment.amount):,.2f}", right_text),
    ])

    # Notes row (if any)
    if payment.notes:
        table_data.append([
            Paragraph("", normal),
            Paragraph("", normal),
            Paragraph(f"Notes: {payment.notes}", ParagraphStyle("notes", parent=normal, fontSize=9, textColor=gray)),
            Paragraph("", normal),
        ])

    # Total row
    table_data.append([
        Paragraph("", normal),
        Paragraph("", normal),
        Paragraph("<b>TOTAL</b>", right_text),
        Paragraph(f"<b>{float(payment.amount):,.2f} /-</b>", right_text),
    ])

    txn_table = Table(table_data, colWidths=[col_sr, col_type, col_date, col_amount])
    txn_table.setStyle(TableStyle([
        # Borders
        ("BOX", (0, 0), (-1, -1), 1, border_c),
        ("INNERGRID", (0, 0), (-1, 0), 0.5, border_c),  # Header grid
        ("LINEBELOW", (0, 0), (-1, 0), 1, border_c),      # Header bottom
        ("LINEABOVE", (2, -1), (-1, -1), 1, border_c),     # Total top line
        # Padding
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        # Header style
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    elements.append(txn_table)
    elements.append(Spacer(1, 5*mm))

    # ── AMOUNT IN WORDS ───────────────────────────
    amount_float = float(payment.amount)
    words = _amount_in_words(amount_float)

    words_data = [
        [Paragraph("<b>Received Rupees:</b>", normal),
         Paragraph(words, amount_words),
         Paragraph(f"By {payment.mode.value.replace('_', ' ').title()}.", bold)],
    ]
    words_table = Table(words_data, colWidths=[35*mm, content_width - 70*mm, 35*mm])
    words_table.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (1, 0), (1, 0), 0.5, light_border),
    ]))
    elements.append(words_table)
    elements.append(Spacer(1, 15*mm))

    # ── SIGNATURE LINE ────────────────────────────
    sig_data = [
        [Paragraph("<b>Received by</b>  ____________________", normal),
         Paragraph("<b>Receiver's Signature</b>", right_text)],
    ]
    sig_table = Table(sig_data, colWidths=[col_half, col_half])
    sig_table.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
    ]))
    elements.append(sig_table)
    elements.append(Spacer(1, 8*mm))

    # ── FOOTER ────────────────────────────────────
    elements.append(HRFlowable(width="100%", thickness=0.5, color=light_border))
    elements.append(Spacer(1, 2*mm))
    elements.append(Paragraph("This is a computer-generated receipt.", small_center))
    elements.append(Paragraph(
        f"Generated on {datetime.now().strftime('%d %b %Y, %I:%M %p')} | Powered by FitNexus",
        small_center
    ))

    doc.build(elements)
    return buffer.getvalue()
