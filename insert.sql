
INSERT INTO users
(username, email, password, admin)
VALUES
('admin', 'admin@admin.is', '$2a$04$7aaQvd6IRTvxp2Rbz.kpP.zaQMJ8k2HesjH7IHLrxqX6UWSPJ.Opu', true);

INSERT INTO users
(username, email, password, admin)
VALUES
('user', 'user@user.is', '$2a$04$7aaQvd6IRTvxp2Rbz.kpP.zaQMJ8k2HesjH7IHLrxqX6UWSPJ.Opu', false);

INSERT INTO categories 
(title)
VALUES 
('clothing');

INSERT INTO products
(title, price, description, category)
VALUES
('Cool jeans', 500.00, 'Very nice jeans', 1);