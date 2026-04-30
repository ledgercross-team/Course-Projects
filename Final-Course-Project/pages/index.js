import React, { Component } from "react";
import { Card, Button, Message } from "semantic-ui-react";
import { getFactory } from "../ethereum/factory";
import Layout from "../components/Layout";
import Link from "next/link";

class CampaignIndex extends Component {
  static async getInitialProps() {
    try {
      const factory = getFactory();
      if (!factory) {
        return {
          campaigns: [],
          configError:
            "Missing FACTORY_ADDRESS. Deploy the factory contract and set FACTORY_ADDRESS (and NEXT_PUBLIC_FACTORY_ADDRESS) in .env.",
        };
      }

      const campaigns = await factory.methods.getDeployedCampaigns().call();
      return { campaigns };
    } catch (err) {
      return {
        campaigns: [],
        configError: err?.message || "Failed to load campaigns.",
      };
    }
  }
  renderCampaigns() {
    const items = this.props.campaigns.map((address) => {
      return {
        header: address,
        description: (
          <Link
            href={{
              pathname: "/campaigns/show",
              query: { address },
            }}
          >
            <a>View Campaign</a>
          </Link>
        ),
        fluid: true,
      };
    });
    return <Card.Group items={items} />;
  }
  render() {
    return (
      <Layout>
        <div>
          <h3>Open Campaigns</h3>
          {this.props.configError ? (
            <Message
              warning
              header="Ethereum configuration needed"
              content={this.props.configError}
            />
          ) : null}
          <Link href="/campaigns/new">
            <a>
              <Button
                floated="right"
                content="Create Campaign"
                icon="add circle"
                primary
              />
            </a>
          </Link>
          {this.renderCampaigns()}
        </div>
      </Layout>
    );
  }
}

export default CampaignIndex;
