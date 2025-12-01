const Airtable = require('airtable');

class AirtableService {
  constructor() {
    // Configure Airtable
    Airtable.configure({
      apiKey: process.env.AIRTABLE_API_KEY
    });

    this.base = Airtable.base(process.env.AIRTABLE_BASE_ID);
    this.propertiesTable = process.env.AIRTABLE_TABLE_NAME || 'Properties';
    this.inquiriesTable = process.env.AIRTABLE_INQUIRIES_TABLE || 'Inquiries';
  }

  /**
   * Get all properties from Airtable
   * @param {Object} filters - Optional filters (status, maxPrice, etc.)
   * @returns {Promise<Array>} Array of property records
   */
  async getAllProperties(filters = {}) {
    try {
      const records = [];
      const query = this.base(this.propertiesTable).select({
        view: 'Grid view'
      });

      await query.eachPage((pageRecords, fetchNextPage) => {
        pageRecords.forEach(record => {
          records.push({
            id: record.id,
            ...record.fields
          });
        });
        fetchNextPage();
      });

      // Apply client-side filtering if needed
      let filteredRecords = records;
      
      if (filters.status) {
        filteredRecords = filteredRecords.filter(r => 
          r.Status && r.Status.toLowerCase() === filters.status.toLowerCase()
        );
      }

      if (filters.maxPrice) {
        filteredRecords = filteredRecords.filter(r => 
          r.Price && r.Price <= parseFloat(filters.maxPrice)
        );
      }

      if (filters.minPrice) {
        filteredRecords = filteredRecords.filter(r => 
          r.Price && r.Price >= parseFloat(filters.minPrice)
        );
      }

      if (filters.propertyType) {
        filteredRecords = filteredRecords.filter(r => 
          r.PropertyType && r.PropertyType.toLowerCase() === filters.propertyType.toLowerCase()
        );
      }

      return filteredRecords;
    } catch (error) {
      console.error('Error fetching properties from Airtable:', error);
      throw new Error('Failed to fetch properties');
    }
  }

  /**
   * Get a single property by ID
   * @param {string} id - Airtable record ID
   * @returns {Promise<Object>} Property record
   */
  async getPropertyById(id) {
    try {
      const record = await this.base(this.propertiesTable).find(id);
      return {
        id: record.id,
        ...record.fields
      };
    } catch (error) {
      console.error('Error fetching property from Airtable:', error);
      throw new Error('Property not found');
    }
  }

  /**
   * Create a new property
   * @param {Object} propertyData - Property information
   * @returns {Promise<Object>} Created property record
   */
  async createProperty(propertyData) {
    try {
      const record = await this.base(this.propertiesTable).create([
        {
          fields: propertyData
        }
      ]);

      return {
        id: record[0].id,
        ...record[0].fields
      };
    } catch (error) {
      console.error('Error creating property in Airtable:', error);
      throw new Error('Failed to create property');
    }
  }

  /**
   * Update an existing property
   * @param {string} id - Airtable record ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated property record
   */
  async updateProperty(id, updates) {
    try {
      const record = await this.base(this.propertiesTable).update([
        {
          id: id,
          fields: updates
        }
      ]);

      return {
        id: record[0].id,
        ...record[0].fields
      };
    } catch (error) {
      console.error('Error updating property in Airtable:', error);
      throw new Error('Failed to update property');
    }
  }

  /**
   * Delete a property
   * @param {string} id - Airtable record ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteProperty(id) {
    try {
      await this.base(this.propertiesTable).destroy([id]);
      return true;
    } catch (error) {
      console.error('Error deleting property from Airtable:', error);
      throw new Error('Failed to delete property');
    }
  }

  /**
   * Create an inquiry/contact submission
   * @param {Object} inquiryData - Inquiry information
   * @returns {Promise<Object>} Created inquiry record
   */
  async createInquiry(inquiryData) {
    try {
      const record = await this.base(this.inquiriesTable).create([
        {
          fields: {
            ...inquiryData,
            SubmittedAt: new Date().toISOString()
          }
        }
      ]);

      return {
        id: record[0].id,
        ...record[0].fields
      };
    } catch (error) {
      console.error('Error creating inquiry in Airtable:', error);
      throw new Error('Failed to submit inquiry');
    }
  }
}

module.exports = new AirtableService();
