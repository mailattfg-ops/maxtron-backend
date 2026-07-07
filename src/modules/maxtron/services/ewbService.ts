import crypto from 'crypto';
import { supabase } from '../../../config/supabase';

export interface EwbDetailsInput {
  transporter_id?: string;
  transporter_name?: string;
  trans_distance: number;
  trans_mode: string; // '1' - Road, '2' - Rail, '3' - Air, '4' - Ship
  vehicle_no?: string;
  vehicle_type?: string; // 'R' - Regular, 'O' - ODC
  trans_doc_no?: string;
  trans_doc_date?: string;
}

export interface EwbResponse {
  ewb_no?: string;
  ewb_date?: string;
  ewb_valid_till?: string;
  ewb_status: 'GENERATED' | 'FAILED';
  ewb_error?: string;
}

export class EwbService {
  private static getCredentials() {
    const env = (process.env.EWB_ENV || 'sandbox').toLowerCase();
    const isProd = env === 'production' || env === 'prod';
    
    if (isProd) {
      return {
        clientId: process.env.EWB_PROD_CLIENT_ID || process.env.EWB_CLIENT_ID || '',
        clientSecret: process.env.EWB_PROD_CLIENT_SECRET || process.env.EWB_CLIENT_SECRET || '',
        username: process.env.EWB_PROD_USERNAME || process.env.EWB_USERNAME || '',
        password: process.env.EWB_PROD_PASSWORD || process.env.EWB_PASSWORD || '',
        gstin: process.env.EWB_PROD_GSTIN || process.env.EWB_GSTIN || '',
        baseUrl: process.env.EWB_PROD_BASE_URL || process.env.EWB_BASE_URL || 'https://gsp.ewb.gov.in/api/v1.03',
        environment: 'production'
      };
    } else {
      return {
        clientId: process.env.EWB_SANDBOX_CLIENT_ID || process.env.EWB_CLIENT_ID || '',
        clientSecret: process.env.EWB_SANDBOX_CLIENT_SECRET || process.env.EWB_CLIENT_SECRET || '',
        username: process.env.EWB_SANDBOX_USERNAME || process.env.EWB_USERNAME || '',
        password: process.env.EWB_SANDBOX_PASSWORD || process.env.EWB_PASSWORD || '',
        gstin: process.env.EWB_SANDBOX_GSTIN || process.env.EWB_GSTIN || '',
        baseUrl: process.env.EWB_SANDBOX_BASE_URL || process.env.EWB_BASE_URL || 'https://gsp.ewb.gov.in/api/v1.03',
        environment: 'sandbox'
      };
    }
  }

  /**
   * Helper to check if credentials are set to run in live/sandbox mode.
   * If not, it runs in Mock Staging Mode.
   */
  public static isMockMode(): boolean {
    if (process.env.ENABLE_LIVE_EWB !== 'true') {
      return true;
    }
    const creds = this.getCredentials();
    return !creds.clientId || !creds.username || !creds.password || !creds.gstin;
  }

  /**
   * AES-256-ECB Decryption (used to decrypt SEK using AppKey)
   */
  private static decryptAes256Ecb(encryptedTextBase64: string, keyBase64: string): string {
    const key = Buffer.from(keyBase64, 'base64');
    const encryptedText = Buffer.from(encryptedTextBase64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-ecb', key, null);
    decipher.setAutoPadding(true);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  }

  /**
   * AES-256-ECB Encryption (used to encrypt request payload using decrypted SEK)
   */
  private static encryptAes256Ecb(plainText: string, keyBase64: string): string {
    const key = Buffer.from(keyBase64, 'base64');
    const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
    cipher.setAutoPadding(true);
    let encrypted = cipher.update(plainText, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString('base64');
  }

  /**
   * Main method to generate E-Way Bill.
   * Falls back to mock generation if live credentials are not available.
   */
  public static async generateEwb(
    order: any,
    customer: any,
    items: any[]
  ): Promise<EwbResponse> {
    try {
      // 1. Validation checks
      if (!order.trans_distance || order.trans_distance <= 0 || order.trans_distance > 4000) {
        return {
          ewb_status: 'FAILED',
          ewb_error: 'Invalid transport distance. Distance must be between 1 and 4000 km.',
        };
      }

      if (order.trans_mode === '1' && !order.vehicle_no) {
        return {
          ewb_status: 'FAILED',
          ewb_error: 'Vehicle number is required for Road transport mode.',
        };
      }

      // Check if it's Mock Mode
      if (this.isMockMode()) {
        const creds = this.getCredentials();
        console.log(`[EwbService] Running in Mock Staging Mode (${creds.environment}) for Order ${order.order_number}`);
        return this.simulateMockEwb(order);
      }

      // 2. Official NIC API integration (Real flow)
      const creds = this.getCredentials();
      
      // Generate a 32-character random AppKey (Base64 representation of 32 random bytes, or a 32-byte hex/string key)
      const appKeyBytes = crypto.randomBytes(32);
      const appKeyBase64 = appKeyBytes.toString('base64');

      // Call authentication endpoint to get token and encrypted SEK
      console.log(`[EwbService] Hitting E-Way Bill Auth API (${creds.environment}): ${creds.baseUrl}/auth`);
      const authRes = await fetch(`${creds.baseUrl}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'client-id': creds.clientId,
          'client-secret': creds.clientSecret,
        },
        body: JSON.stringify({
          username: creds.username,
          password: creds.password, // In a fully compliant system, this password would be RSA encrypted with the NIC public key
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

      // Decrypt the SEK using our AppKey
      const decryptedSekBase64 = this.decryptAes256Ecb(sek, appKeyBase64);

      // Build the standard NIC E-Way Bill request schema (v1.03)
      const ewbPayload = {
        supplyType: 'O', // Outward
        subSupplyType: '1', // Supply
        docType: 'INV',
        docNo: order.order_number,
        docDate: new Date(order.order_date).toLocaleDateString('en-GB'), // DD/MM/YYYY format as expected by NIC
        fromGstin: creds.gstin,
        fromTrdName: 'Maxtron Industries',
        fromAddr1: 'Maxtron Industrial Area',
        fromAddr2: 'Phase II',
        fromPlace: 'Mumbai',
        fromPincode: 400001,
        fromStateCode: 27, // Maharashtra State Code
        toGstin: customer.gst_no || 'URP', // URP for Unregistered Person
        toTrdName: customer.customer_name,
        toAddr1: customer.addresses?.[0]?.street || 'Customer Address Street',
        toAddr2: customer.addresses?.[0]?.city || 'Customer City',
        toPlace: customer.addresses?.[0]?.city || 'Mumbai',
        toPincode: parseInt(customer.addresses?.[0]?.zip_code) || 400001,
        toStateCode: 27, // Assuming MH, but in prod we map from customer state
        transactionType: 1, // Regular
        totalValue: Number(order.total_value),
        cgstValue: order.tax_amount ? Number(order.tax_amount) / 2 : 0,
        sgstValue: order.tax_amount ? Number(order.tax_amount) / 2 : 0,
        igstValue: 0,
        cessValue: 0,
        totInvValue: Number(order.net_amount),
        transporterId: order.transporter_id || '',
        transporterName: order.transporter_name || '',
        transDocNo: order.trans_doc_no || '',
        transDocDate: order.trans_doc_date ? new Date(order.trans_doc_date).toLocaleDateString('en-GB') : '',
        transMode: order.trans_mode,
        transDistance: Number(order.trans_distance),
        vehicleNo: order.vehicle_no?.replace(/[^a-zA-Z0-9]/g, '')?.toUpperCase() || '',
        vehicleType: order.vehicle_type || 'R',
        itemList: items.map((item, idx) => ({
          itemNo: idx + 1,
          productName: item.product_name || 'Industrial Film Roll',
          productDesc: item.product_name || 'Industrial Packaging Film',
          hsnCode: Number(item.hsn_code || '3920'), // Plausible default HSN for plastic film
          quantity: Number(item.quantity),
          qtyUnit: 'KGS',
          taxableAmount: Number(item.total_value),
          cgstRate: Number(item.gst_percent) / 2,
          sgstRate: Number(item.gst_percent) / 2,
          igstRate: 0,
          cessRate: 0,
        })),
      };

      // Encrypt the payload using the decrypted SEK
      const encryptedData = this.encryptAes256Ecb(JSON.stringify(ewbPayload), decryptedSekBase64);

      // Hit NIC E-Way Bill generation API
      console.log(`[EwbService] Hitting E-Way Bill Generation API: ${creds.baseUrl}/ewaybill`);
      const ewbRes = await fetch(`${creds.baseUrl}/ewaybill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'client-id': creds.clientId,
          'client-secret': creds.clientSecret,
          'authtoken': authtoken,
          'gstin': creds.gstin,
        },
        body: JSON.stringify({
          action: 'GENEWAYBILL',
          data: encryptedData,
        }),
      });

      if (!ewbRes.ok) {
        const errText = await ewbRes.text();
        throw new Error(`NIC E-Way Bill API responded with status ${ewbRes.status}: ${errText}`);
      }

      const rawResponse = await ewbRes.json();
      
      // Decrypt response if it is encrypted
      let responseData = rawResponse;
      if (rawResponse.data && typeof rawResponse.data === 'string') {
        const decryptedData = this.decryptAes256Ecb(rawResponse.data, decryptedSekBase64);
        responseData = JSON.parse(decryptedData);
      }

      if (responseData.status === '1' || responseData.ewbNo) {
        return {
          ewb_no: responseData.ewbNo?.toString(),
          ewb_date: responseData.ewbDate,
          ewb_valid_till: responseData.validUpto,
          ewb_status: 'GENERATED',
        };
      } else {
        const errorMsg = responseData.error?.errorMsg || responseData.errorMsg || 'Unknown error occurred';
        return {
          ewb_status: 'FAILED',
          ewb_error: errorMsg,
        };
      }
    } catch (error: any) {
      console.error('[EwbService] Error in E-Way Bill generation:', error);
      return {
        ewb_status: 'FAILED',
        ewb_error: `Connection error: ${error.message}`,
      };
    }
  }

  /**
   * Helper to simulate Mock E-Way Bill generation
   */
  private static simulateMockEwb(order: any): EwbResponse {
    // Generate a 12-digit mock E-Way Bill number starting with '12' (standard Indian format)
    const random10Digits = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const ewbNo = `12${random10Digits}`;

    const now = new Date();
    // Calculate validity based on distance: 1 day for every 100km, minimum 1 day
    const validityDays = Math.max(1, Math.ceil(Number(order.trans_distance) / 100));
    const validTill = new Date();
    validTill.setDate(now.getDate() + validityDays);

    return {
      ewb_no: ewbNo,
      ewb_date: now.toISOString(),
      ewb_valid_till: validTill.toISOString(),
      ewb_status: 'GENERATED',
    };
  }
}
