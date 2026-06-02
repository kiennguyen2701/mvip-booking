import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Escape XML special chars
function x(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatMoney(value: number | null | undefined): string {
  if (!value) return "0";
  return Number(value).toLocaleString("vi-VN");
}

type BookingRow = {
  booking_code?: string | null;
  created_at?: string | null;
  booking_date?: string | null;
  booking_time?: string | null;
  customer_name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  service_name?: string | null;
  guest_count?: number | null;
  guests?: number | null;
  status?: string | null;
  total_bill?: number | null;
  customer_discount_amount?: number | null;
  platform_commission_amount?: number | null;
  agent_commission_amount?: number | null;
  platform_net_amount?: number | null;
  note?: string | null;
  supplier_note?: string | null;
  cancellation_reason?: string | null;
};

function buildXlsx(bookings: BookingRow[], from: string, to: string): Buffer {
  const headers = [
    "Booking Code",
    "Ngày tạo",
    "Ngày đặt",
    "Giờ",
    "Tên khách",
    "Điện thoại",
    "WhatsApp",
    "Nhà hàng / Dịch vụ",
    "Số khách",
    "Trạng thái",
    "Tổng bill (VNĐ)",
    "Giảm giá KH (VNĐ)",
    "Hoa hồng platform (VNĐ)",
    "Hoa hồng agent (VNĐ)",
    "Platform net (VNĐ)",
    "Ghi chú",
  ];

  // Build rows
  const dataRows = bookings.map((b) => [
    b.booking_code || "",
    b.created_at ? b.created_at.slice(0, 10) : "",
    b.booking_date || "",
    b.booking_time || "",
    b.customer_name || "",
    b.phone || "",
    b.whatsapp || "",
    b.service_name || "",
    String(b.guest_count ?? b.guests ?? ""),
    b.status || "",
    formatMoney(b.total_bill),
    formatMoney(b.customer_discount_amount),
    formatMoney(b.platform_commission_amount),
    formatMoney(b.agent_commission_amount),
    formatMoney(b.platform_net_amount),
    [b.note, b.supplier_note, b.cancellation_reason].filter(Boolean).join(" | "),
  ]);

  // Shared strings table
  const allStrings: string[] = [];
  const stringIndex = new Map<string, number>();

  function si(val: string): number {
    if (!stringIndex.has(val)) {
      stringIndex.set(val, allStrings.length);
      allStrings.push(val);
    }
    return stringIndex.get(val)!;
  }

  // Encode rows to XML cells
  function encodeRow(rowIndex: number, cols: string[]): string {
    const cells = cols
      .map((val, colIndex) => {
        const colLetter = String.fromCharCode(65 + colIndex);
        const cellRef = `${colLetter}${rowIndex}`;
        const idx = si(val);
        return `<c r="${cellRef}" t="s"><v>${idx}</v></c>`;
      })
      .join("");
    return `<row r="${rowIndex}">${cells}</row>`;
  }

  const sheetRows: string[] = [];
  sheetRows.push(encodeRow(1, headers));
  dataRows.forEach((row, i) => {
    sheetRows.push(encodeRow(i + 2, row));
  });

  // XML parts
  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${allStrings.length}" uniqueCount="${allStrings.length}">
${allStrings.map((s) => `<si><t xml:space="preserve">${x(s)}</t></si>`).join("\n")}
</sst>`;

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>
${sheetRows.join("\n")}
</sheetData>
</worksheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
  <sheet name="Booking Report" sheetId="1" r:id="rId1"/>
</sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

  // Build ZIP manually (PKZIP format)
  function toBytes(str: string): Uint8Array {
    return Buffer.from(str, "utf-8");
  }

  const files: { name: string; data: Uint8Array }[] = [
    { name: "[Content_Types].xml", data: toBytes(contentTypes) },
    { name: "_rels/.rels", data: toBytes(rootRels) },
    { name: "xl/workbook.xml", data: toBytes(workbookXml) },
    { name: "xl/_rels/workbook.xml.rels", data: toBytes(workbookRels) },
    { name: "xl/worksheets/sheet1.xml", data: toBytes(sheetXml) },
    { name: "xl/sharedStrings.xml", data: toBytes(sharedStringsXml) },
  ];

  // Simple ZIP builder (store method, no compression)
  const parts: Buffer[] = [];
  const centralDir: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = Buffer.from(file.name, "utf-8");
    const data = Buffer.from(file.data);
    const crc = crc32(data);
    const size = data.length;

    // Local file header
    const localHeader = Buffer.alloc(30 + nameBytes.length);
    localHeader.writeUInt32LE(0x04034b50, 0);  // signature
    localHeader.writeUInt16LE(20, 4);           // version needed
    localHeader.writeUInt16LE(0, 6);            // flags
    localHeader.writeUInt16LE(0, 8);            // compression: store
    localHeader.writeUInt16LE(0, 10);           // mod time
    localHeader.writeUInt16LE(0, 12);           // mod date
    localHeader.writeUInt32LE(crc, 14);         // crc32
    localHeader.writeUInt32LE(size, 18);        // compressed size
    localHeader.writeUInt32LE(size, 22);        // uncompressed size
    localHeader.writeUInt16LE(nameBytes.length, 26); // name length
    localHeader.writeUInt16LE(0, 28);           // extra length
    nameBytes.copy(localHeader, 30);

    parts.push(localHeader, data);

    // Central directory entry
    const central = Buffer.alloc(46 + nameBytes.length);
    central.writeUInt32LE(0x02014b50, 0);  // signature
    central.writeUInt16LE(20, 4);           // version made by
    central.writeUInt16LE(20, 6);           // version needed
    central.writeUInt16LE(0, 8);            // flags
    central.writeUInt16LE(0, 10);           // compression
    central.writeUInt16LE(0, 12);           // mod time
    central.writeUInt16LE(0, 14);           // mod date
    central.writeUInt32LE(crc, 16);         // crc32
    central.writeUInt32LE(size, 20);        // compressed size
    central.writeUInt32LE(size, 24);        // uncompressed size
    central.writeUInt16LE(nameBytes.length, 28); // name length
    central.writeUInt16LE(0, 30);           // extra length
    central.writeUInt16LE(0, 32);           // comment length
    central.writeUInt16LE(0, 34);           // disk start
    central.writeUInt16LE(0, 36);           // internal attrs
    central.writeUInt32LE(0, 38);           // external attrs
    central.writeUInt32LE(offset, 42);      // local header offset
    nameBytes.copy(central, 46);
    centralDir.push(central);

    offset += localHeader.length + data.length;
  }

  const centralDirBuffer = Buffer.concat(centralDir);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);           // signature
  eocd.writeUInt16LE(0, 4);                     // disk number
  eocd.writeUInt16LE(0, 6);                     // disk with CD
  eocd.writeUInt16LE(files.length, 8);          // entries on disk
  eocd.writeUInt16LE(files.length, 10);         // total entries
  eocd.writeUInt32LE(centralDirBuffer.length, 12); // CD size
  eocd.writeUInt32LE(offset, 16);               // CD offset
  eocd.writeUInt16LE(0, 20);                    // comment length

  return Buffer.concat([...parts, centralDirBuffer, eocd]);
}

// CRC-32 implementation
function crc32(buf: Buffer): number {
  const table = makeCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

let _crcTable: number[] | null = null;
function makeCrcTable(): number[] {
  if (_crcTable) return _crcTable;
  _crcTable = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    _crcTable[i] = c;
  }
  return _crcTable;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: supplier } = await adminClient
      .from("suppliers")
      .select("id, company_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    if (!from || !to) {
      return NextResponse.json({ error: "Missing from/to date" }, { status: 400 });
    }

    // Fetch bookings in date range (tất cả status)
    const { data: bookings, error } = await adminClient
      .from("bookings")
      .select(`
        booking_code, created_at, booking_date, booking_time,
        customer_name, phone, whatsapp, service_name,
        guest_count, guests, status,
        total_bill, customer_discount_amount,
        platform_commission_amount, agent_commission_amount, platform_net_amount,
        note, supplier_note, cancellation_reason
      `)
      .eq("supplier_id", supplier.id)
      .gte("booking_date", from)
      .lte("booking_date", to)
      .order("booking_date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const xlsx = buildXlsx((bookings || []) as BookingRow[], from, to);

    const filename = `mvip-report-${supplier.company_name?.replace(/\s+/g, "-") || "supplier"}-${from}-${to}.xlsx`;

    return new NextResponse(xlsx, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("SUPPLIER_REPORT_ERROR:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
