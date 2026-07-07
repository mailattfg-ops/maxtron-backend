import crypto from 'crypto';
import { supabase } from '../../../config/supabase';

export interface EInvoiceResponse {
  irn?: string;
  ack_no?: string;
  ack_date?: string;
  status: 'GENERATED' | 'FAILED';
  error?: string;
}

export class EInvoiceService {
  private static getCredentials() {
    const env = (process.env.EINVOICE_ENV || 'sandbox').toLowerCase();
    const isProd = env === 'production' || env === 'prod';
    
    if (isProd) {
      return {
        clientId: process.env.EINVOICE_PROD_CLIENT_ID || process.env.EINVOICE_CLIENT_ID || '',
        clientSecret: process.env.EINVOICE_PROD_CLIENT_SECRET || process.env.EINVOICE_CLIENT_SECRET || '',
        username: process.env.EINVOICE_PROD_USERNAME || process.env.EINVOICE_USERNAME || '',
        password: process.env.EINVOICE_PROD_PASSWORD || process.env.EINVOICE_PASSWORD || '',
        gstin: process.env.EINVOICE_PROD_GSTIN || process.env.EINVOICE_GSTIN || '',
        baseUrl: process.env.EINVOICE_PROD_BASE_URL || process.env.EINVOICE_BASE_URL || 'https://gsp.einvoice.gov.in/api/v1.03',
        environment: 'production'
      };
    } else {
      return {
        clientId: process.env.EINVOICE_SANDBOX_CLIENT_ID || process.env.EINVOICE_CLIENT_ID || '',
        clientSecret: process.env.EINVOICE_SANDBOX_CLIENT_SECRET || process.env.EINVOICE_CLIENT_SECRET || '',
        username: process.env.EINVOICE_SANDBOX_USERNAME || process.env.EINVOICE_USERNAME || '',
        password: process.env.EINVOICE_SANDBOX_PASSWORD || process.env.EINVOICE_PASSWORD || '',
        gstin: process.env.EINVOICE_SANDBOX_GSTIN || process.env.EINVOICE_GSTIN || '',
        baseUrl: process.env.EINVOICE_SANDBOX_BASE_URL || process.env.EINVOICE_BASE_URL || 'https://gsp.einvoice.gov.in/api/v1.03',
        environment: 'sandbox'
      };
    }
  }

  public static isMockMode(): boolean {
    if (process.env.ENABLE_LIVE_EINVOICE !== 'true') {
      return true;
    }
    const creds = this.getCredentials();
    return !creds.clientId || !creds.username || !creds.password || !creds.gstin;
  }

  private static decryptAes256Ecb(encryptedTextBase64: string, keyBase64: string): string {
    const key = Buffer.from(keyBase64, 'base64');
    const encryptedText = Buffer.from(encryptedTextBase64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-ecb', key, null);
    decipher.setAutoPadding(true);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  }

  private static encryptAes256Ecb(plainText: string, keyBase64: string): string {
    const key = Buffer.from(keyBase64, 'base64');
    const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
    cipher.setAutoPadding(true);
    let encrypted = cipher.update(plainText, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString('base64');
  }

  /**
   * Main method to generate E-Invoice (IRN)
   */
  public static async generateEInvoice(
    invoice: any,
    customer: any,
    items: any[]
  ): Promise<EInvoiceResponse> {
    try {
      // 1. Validation
      if (!customer.gst_no) {
        return {
          status: 'FAILED',
          error: 'E-Invoice can only be generated for B2B transactions. Customer GST No is missing.',
        };
      }

      // Check if Mock Mode
      if (this.isMockMode()) {
        const creds = this.getCredentials();
        console.log(`[EInvoiceService] Running in Mock Mode (${creds.environment}) for Invoice ${invoice.invoice_number}`);
        return this.simulateMockEInvoice(invoice);
      }

      const creds = this.getCredentials();
      const appKeyBytes = crypto.randomBytes(32);
      const appKeyBase64 = appKeyBytes.toString('base64');

      console.log(`[EInvoiceService] Authenticating with E-Invoice API (${creds.environment}): ${creds.baseUrl}/auth`);
      const authRes = await fetch(`${creds.baseUrl}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'client-id': creds.clientId,
          'client-secret': creds.clientSecret,
        },
        body: JSON.stringify({
          username: creds.username,
          password: creds.password,
          appKey: appKeyBase64,
        }),
      });

      if (!authRes.ok) {
        const errText = await authRes.text();
        throw new Error(`Authentication failed with status ${authRes.status}: ${errText}`);
      }

      const authData = await authRes.json();
      const { authtoken, sek } = authData;

      if (!authtoken || !sek) {
        throw new Error(`Invalid response from Auth API: missing authtoken or sek.`);
      }

      // Decrypt SEK using AppKey
      const decryptedSekBase64 = this.decryptAes256Ecb(sek, appKeyBase64);

      // Build standard Schema v1.03
      const einvoicePayload = {
        Version: "1.03",
        TranDtls: {
          TaxSch: "GST",
          SupTyp: "B2B",
          RegRev: "N",
        },
        DocDtls: {
          Typ: "INV",
          No: invoice.invoice_number,
          Dt: new Date(invoice.invoice_date).toLocaleDateString('en-GB'), // DD/MM/YYYY
        },
        SellerDtls: {
          Gstin: creds.gstin,
          LglNm: "Maxtron Industries",
          Addr1: "Maxtron Industrial Area",
          Loc: "Mumbai",
          Pin: 400001,
          Stcd: "27",
        },
        BuyerDtls: {
          Gstin: customer.gst_no,
          LglNm: customer.customer_name,
          Pos: "27", // State code
          Addr1: customer.addresses?.[0]?.street || "Customer Address",
          Loc: customer.addresses?.[0]?.city || "Mumbai",
          Pin: parseInt(customer.addresses?.[0]?.zip_code) || 400001,
          Stcd: "27",
        },
        ValDtls: {
          AssVal: Number(invoice.total_amount),
          CgstVal: invoice.tax_amount ? Number(invoice.tax_amount) / 2 : 0,
          SgstVal: invoice.tax_amount ? Number(invoice.tax_amount) / 2 : 0,
          IgstVal: 0,
          CesVal: 0,
          StVal: 0,
          TotInvVal: Number(invoice.net_amount),
        },
        ItemList: items.map((item: any, idx: number) => ({
          SlNo: (idx + 1).toString(),
          PrdDesc: item.finished_products?.product_name || "Industrial Product",
          IsServc: "N",
          HsnCd: item.finished_products?.hsn_code || "3920",
          Qty: Number(item.quantity),
          Unit: "KGS",
          UnitPrice: Number(item.rate),
          TotAmt: Number(item.amount),
          AssAmt: Number(item.amount),
          GstRt: Number(item.gst_percent || 18),
          CgstAmt: item.gst_amount ? Number(item.gst_amount) / 2 : 0,
          SgstAmt: item.gst_amount ? Number(item.gst_amount) / 2 : 0,
          IgstAmt: 0,
        })),
      };

      const encryptedData = this.encryptAes256Ecb(JSON.stringify(einvoicePayload), decryptedSekBase64);

      console.log(`[EInvoiceService] Hitting E-Invoice Generation API: ${creds.baseUrl}/invoice`);
      const apiRes = await fetch(`${creds.baseUrl}/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'client-id': creds.clientId,
          'client-secret': creds.clientSecret,
          'authtoken': authtoken,
          'gstin': creds.gstin,
        },
        body: JSON.stringify({
          action: 'GENERATE',
          data: encryptedData,
        }),
      });

      if (!apiRes.ok) {
        const errText = await apiRes.text();
        throw new Error(`E-Invoice API responded with status ${apiRes.status}: ${errText}`);
      }

      const rawResponse = await apiRes.json();
      
      let responseData = rawResponse;
      if (rawResponse.data && typeof rawResponse.data === 'string') {
        const decryptedData = this.decryptAes256Ecb(rawResponse.data, decryptedSekBase64);
        responseData = JSON.parse(decryptedData);
      }

      if (responseData.status === '1' || responseData.Irn) {
        return {
          irn: responseData.Irn,
          ack_no: responseData.AckNo?.toString(),
          ack_date: responseData.AckDt,
          status: 'GENERATED',
        };
      } else {
        const errorMsg = responseData.error?.errorMsg || responseData.errorMsg || 'Unknown error occurred';
        return {
          status: 'FAILED',
          error: errorMsg,
        };
      }
    } catch (error: any) {
      console.error('[EInvoiceService] Error in E-Invoice generation:', error);
      return {
        status: 'FAILED',
        error: `Connection error: ${error.message}`,
      };
    }
  }

  private static simulateMockEInvoice(invoice: any): EInvoiceResponse {
    // Generate a 64-character hex IRN string (Standard IRN is 64 hex characters)
    const irn = crypto.randomBytes(32).toString('hex');
    
    // Ack No is standard 15 digit number
    const ack_no = Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
    const ack_date = new Date().toISOString();

    return {
      irn,
      ack_no,
      ack_date,
      status: 'GENERATED',
    };
  }
}
